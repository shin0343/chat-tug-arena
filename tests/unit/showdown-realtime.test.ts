import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { DEFAULT_CONFIG, DEFAULT_SHOWDOWN, isConnectionSnapshot, isOverlaySnapshot, type SessionView } from '../../packages/contracts/src/index';
import { createArenaServer } from '../../apps/realtime/src/server';
import { readSessionCookie, SessionRepository } from '../../apps/realtime/src/sessions';
import { ArenaRoom } from '../../apps/realtime/src/room';
import { authorize, FakeSocket, gateway, notification, testConfig, welcome } from '../helpers/twitch';

describe('showdown HTTP workflow and authorization', () => {
  let app: Awaited<ReturnType<typeof createArenaServer>>, base: string, cookie: string, session: SessionView;
  const allowed = 'http://127.0.0.1:3000';
  beforeEach(async () => {
    app = await createArenaServer(testConfig(false)); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/api/session`); cookie = response.headers.get('set-cookie')!.split(';')[0]!; session = await response.json() as SessionView;
  });
  afterEach(async () => { await app.close(); });
  const room = () => app.runtime.room(app.runtime.repository.get(readSessionCookie(cookie))!);
  const post = (name: string, data: object = {}, headers: Record<string, string> = {}) => fetch(`${base}/api/game/${name}`, { method: 'POST', headers: { Cookie: cookie, Origin: allowed, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ roundId: session.snapshot.game!.roundId, expectedState: session.snapshot.game!.state, ...data }) });
  const sync = async () => { session = await (await fetch(`${base}/api/session`, { headers: { Cookie: cookie } })).json() as SessionView; };
  async function configure(extra: object = {}) { const response = await post('configure', { config: DEFAULT_SHOWDOWN, commands: { coral: ' !MAGE ', mint: '!knight' }, settingsRevision: session.snapshot.showdown!.settingsRevision, ...extra }); expect(response.status).toBe(200); session = await response.json() as SessionView; }
  async function ready() { await configure(); const response = await post('rehearse'); expect(response.status).toBe(200); session = await response.json() as SessionView; }
  async function finishFixture() {
    session = await (await post('start')).json() as SessionView;
    const e = room().game.engine; e.advance(3000);
    const at = Date.now() + 3000;
    expect(e.ingest({ type: 'game.input', id: 'fixture-message', sequence: 1, source: 'simulation', channelId: 'simulation-channel', userId: 'fixture-user', displayName: 'Fixture user', team: 'coral', command: '!mage', occurredAt: new Date(at).toISOString() }, at)).toBeNull();
    e.advance(1500); room().game.pause(); await sync();
    const response = await post('finish', { winner: 'mint', position: 1 }); expect(response.status).toBe(200); session = await response.json() as SessionView;
    expect(session.snapshot.showdown?.current).toMatchObject({ winner: 'coral', winningChoice: 'Mage', action: 'Play as Mage in the next match.', reason: 'manual' });
  }
  it('saves server-session settings while disconnected, validates atomically and rejects stale tabs', async () => {
    await configure(); expect(session.snapshot.commands).toEqual({ coral: '!mage', mint: '!knight' }); expect(session.snapshot.game?.state).toBe('IDLE'); expect(isConnectionSnapshot(session.snapshot)).toBe(true);
    const revision = session.snapshot.showdown!.settingsRevision;
    expect((await post('configure', { config: DEFAULT_SHOWDOWN, commands: { coral: '!a', mint: '!b' }, settingsRevision: revision - 1 })).status).toBe(409);
    const bad = await post('configure', { config: { ...DEFAULT_SHOWDOWN, mintName: 'mage' }, commands: { coral: '!same', mint: '!SAME' }, settingsRevision: revision }); expect(bad.status).toBe(422); expect(await bad.json()).toMatchObject({ fields: { mintName: expect.any(String), mintKeyword: expect.any(String) } });
    await sync(); expect(session.snapshot.commands).toEqual({ coral: '!mage', mint: '!knight' }); expect(session.snapshot.showdown?.draft.mintName).toBe('Knight'); expect(session.snapshot.showdown?.settingsRevision).toBe(revision);
    expect((await post('prepare', { config: DEFAULT_SHOWDOWN })).status).toBe(409);
  });
  it('requires a fresh command for chat-ready starts and rechecks the condition after a rematch', async () => {
    await configure({ config: { ...DEFAULT_SHOWDOWN, startCondition: 'chat_ready' } }); session = await (await post('rehearse')).json() as SessionView;
    expect(session.snapshot.showdown?.startReady).toBe(false); expect((await post('start')).status).toBe(409);
    session = await (await post('rehearsal-check')).json() as SessionView; expect(session.snapshot.counters.recognized).toBe(1); expect(session.snapshot.game?.uniqueViewers).toBe(0); expect(session.snapshot.showdown?.startReady).toBe(true);
    session = await (await post('start')).json() as SessionView; expect(session.snapshot.game?.state).toBe('COUNTDOWN');
    session = await (await post('abandon')).json() as SessionView; session = await (await post('rematch')).json() as SessionView;
    expect(session.snapshot.game?.state).toBe('READY'); expect(session.snapshot.showdown?.startReady).toBe(false);
  });
  it('freezes the winner/action and blocks every replacement path until a broadcaster commitment', async () => {
    await ready(); await finishFixture();
    for (const name of ['reset', 'rematch', 'prepare', 'simulate', 'rehearse', 'configure']) { const response = await post(name, { config: DEFAULT_CONFIG, scenario: 'quiet', seed: 42 }); expect(response.status, name).toBe(409); expect(await response.json()).toMatchObject({ error: 'consequence_pending' }); }
    session = await (await post('commit', { winningChoice: 'forged', action: 'forged' })).json() as SessionView;
    const committed = session.snapshot.showdown!.current!; expect(committed.winningChoice).toBe('Mage'); expect(committed.action).toBe('Play as Mage in the next match.'); expect(committed.committedAt).toBeTruthy();
    session = await (await post('commit')).json() as SessionView; expect(session.snapshot.showdown?.current?.committedAt).toBe(committed.committedAt); expect(session.snapshot.showdown?.history).toHaveLength(1);
    const old = session.snapshot.game!.roundId; session = await (await post('rematch')).json() as SessionView; expect(session.snapshot.game?.roundId).not.toBe(old); expect((await post('commit', { roundId: old, expectedState: 'FINISHED' })).status).toBe(409); expect(session.snapshot.showdown?.history[0]?.winningChoice).toBe('Mage');
  });
  it('projects only the current consequence to a cookie-free public overlay and never grants it controls', async () => {
    await ready(); const { key } = await (await fetch(`${base}/api/game/overlay-key`, { headers: { Cookie: cookie } })).json() as { key: string };
    await finishFixture(); const publicHeaders = { Authorization: `Bearer ${key}` };
    const overlay = await (await fetch(`${base}/api/overlay`, { headers: publicHeaders })).json(); expect(isOverlaySnapshot(overlay)).toBe(true); expect(overlay.consequence.summary).toBe('Chat chose Mage for the next match.'); expect(overlay).not.toHaveProperty('showdown'); expect(JSON.stringify(overlay)).not.toMatch(/csrf|userId|fixture-user|settingsRevision/);
    expect(isOverlaySnapshot({ ...overlay, consequence: { ...overlay.consequence, winningChoice: 'forged' } })).toBe(false);
    expect((await fetch(`${base}/api/game/commit`, { method: 'POST', headers: { ...publicHeaders, Origin: allowed, 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(401);
    expect((await post('commit', {}, { 'X-CSRF-Token': 'forged' })).status).toBe(403); expect((await post('commit', {}, { Origin: 'https://evil.example' })).status).toBe(403);
    await sync(); expect(session.snapshot.showdown?.current?.committedAt).toBeNull();
    session = await (await post('commit')).json() as SessionView; const updated = await (await fetch(`${base}/api/overlay`, { headers: publicHeaders })).json(); expect(updated.consequence.committedAt).toBe(session.snapshot.showdown?.current?.committedAt);
    expect((await fetch(`${base}/api/game/finish`, { method: 'POST' })).status).toBe(401);
  });
  it('rejects active settings edits and separates sessions, drafts and history', async () => {
    await ready(); session = await (await post('start')).json() as SessionView;
    expect((await post('configure', { config: DEFAULT_SHOWDOWN, commands: { coral: '!x', mint: '!y' }, settingsRevision: session.snapshot.showdown?.settingsRevision })).status).toBe(409);
    const other = await (await fetch(`${base}/api/session`)).json() as SessionView; expect(other.snapshot.showdown).toMatchObject({ configured: false, history: [], current: null }); expect(other.snapshot.game?.state).toBe('IDLE');
  });
});

describe('confirmed provider → saved showdown → consequence', () => {
  it('uses fixture EventSub, requires a truly fresh check, and retains fixture provenance in history', async () => {
    vi.useFakeTimers(); const repository = new SessionRepository('unused'); const { record } = repository.create(); authorize(record);
    const sockets: FakeSocket[] = []; const room = new ArenaRoom(record, repository, testConfig(), gateway(), () => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
    try {
      await room.connect(); sockets[0]!.receive(welcome()); await vi.advanceTimersByTimeAsync(1);
      await room.configureShowdown({ ...DEFAULT_SHOWDOWN, startCondition: 'chat_ready' }, { coral: '!mage', mint: '!knight' }); expect(room.snapshot().game?.state).toBe('READY'); expect(room.startReady()).toBe(false);
      const stale = notification('stale-check', '!mage'); stale.metadata.message_timestamp = new Date(Date.now() - 500).toISOString(); sockets[0]!.receive(stale); expect(room.snapshot().counters.recognized).toBe(1); expect(room.startReady()).toBe(false);
      sockets[0]!.receive(notification('fresh-check', '!mage')); expect(room.startReady()).toBe(true); expect(room.snapshot().game?.uniqueViewers).toBe(0);
      room.game.start(); await vi.advanceTimersByTimeAsync(3100);
      for (let n = 0; n < 3; n++) { const message = notification(`pull-${n}`, '!mage'); message.payload.event.chatter_user_id = String(900 + n); sockets[0]!.receive(message); }
      await vi.advanceTimersByTimeAsync(800); room.game.finish(); const state = room.snapshot(); expect(state.showdown?.current).toMatchObject({ winningChoice: 'Mage', source: 'twitch', origin: 'test_fixture', action: 'Play as Mage in the next match.' });
      expect(room.showdowns.commit(state.game!.roundId)).toBe(true); room.prepareGame({ ...DEFAULT_SHOWDOWN, startCondition: 'chat_ready' }); expect(room.startReady()).toBe(false); expect(room.snapshot().showdown?.history[0]?.origin).toBe('test_fixture');
    } finally { room.close(); vi.useRealTimers(); }
  });
});
