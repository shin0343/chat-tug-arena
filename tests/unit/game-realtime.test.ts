import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { DEFAULT_CONFIG, isOverlaySnapshot, type SessionView } from '../../packages/contracts/src/index';
import { createArenaServer } from '../../apps/realtime/src/server';
import { SessionRepository, readSessionCookie } from '../../apps/realtime/src/sessions';
import { ArenaRoom } from '../../apps/realtime/src/room';
import { GameController } from '../../apps/realtime/src/game/controller';
import { testConfig, authorize, FakeSocket, gateway, notification, welcome, frame } from '../helpers/twitch';

describe('game HTTP authority and read-only overlay', () => {
  let app: Awaited<ReturnType<typeof createArenaServer>>, origin: string, cookie: string, session: SessionView;
  const allowed = 'http://127.0.0.1:3000';
  beforeEach(async () => {
    app = await createArenaServer(testConfig(false)); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const response = await fetch(`${origin}/api/session`); cookie = response.headers.get('set-cookie')!.split(';')[0]!; session = await response.json() as SessionView;
  });
  afterEach(async () => { await app.close(); });
  const post = (name: string, extra: object = {}) => fetch(`${origin}/api/game/${name}`, { method: 'POST', headers: { Cookie: cookie, Origin: allowed, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ roundId: session.snapshot.game!.roundId, expectedState: session.snapshot.game!.state, ...extra }) });
  async function simulate() {
    const response = await post('simulate', { scenario: 'quiet', seed: 42, config: DEFAULT_CONFIG }); expect(response.status).toBe(200); session = await response.json() as SessionView;
  }
  it('requires source readiness, cookie/CSRF and rejects client physics/result writes', async () => {
    expect((await post('prepare', { config: DEFAULT_CONFIG })).status).toBe(409);
    expect((await fetch(`${origin}/api/game/start`, { method: 'POST' })).status).toBe(401);
    expect((await fetch(`${origin}/api/game/result`, { method: 'POST', body: JSON.stringify({ winner: 'mint', position: 1 }) })).status).toBe(401);
    await simulate(); expect(session.snapshot.game).toMatchObject({ state: 'COUNTDOWN', position: 0, result: null, source: 'simulation' });
    expect((await post('result', { winner: 'mint', position: 1 })).status).toBe(404);
    expect((await fetch(`${origin}/api/game/pause`, { method: 'POST', headers: { Cookie: cookie, Origin: allowed, 'X-CSRF-Token': 'forged', 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(403);
  });
  it('rejects stale/double controls, invalid transitions and validates round/scenario inputs', async () => {
    expect((await post('simulate', { scenario: 'unknown', seed: 42, config: DEFAULT_CONFIG })).status).toBe(422);
    expect((await post('simulate', { scenario: 'quiet', seed: -1, config: DEFAULT_CONFIG })).status).toBe(422);
    expect((await post('simulate', { scenario: 'quiet', seed: 42, config: { ...DEFAULT_CONFIG, durationSeconds: Infinity } })).status).toBe(422);
    await simulate(); expect((await post('start')).status).toBe(409); expect((await post('reset')).status).toBe(409);
    const paused = await post('pause'); expect(paused.status).toBe(200);
    expect((await post('pause')).status).toBe(409); session = await paused.json() as SessionView;
    expect(session.snapshot.game?.state).toBe('PAUSED'); const resumed = await post('resume'); expect(resumed.status).toBe(200);
    expect((await post('resume')).status).toBe(409);
  });
  it('resets and rematches with fresh IDs, membership and event histories', async () => {
    await simulate(); const oldId = session.snapshot.game!.roundId;
    session = await (await post('abandon')).json() as SessionView;
    expect(session.snapshot.game?.result).toMatchObject({ reason: 'abandoned', winner: null });
    session = await (await post('rematch')).json() as SessionView;
    expect(session.snapshot.game!.roundId).not.toBe(oldId); expect(session.snapshot.game?.state).toBe('COUNTDOWN'); expect(session.snapshot.game?.uniqueViewers).toBe(0);
    expect((await post('pause', { roundId: oldId })).status).toBe(409);
    session = await (await post('abandon')).json() as SessionView; session = await (await post('reset')).json() as SessionView;
    expect(session.snapshot.game).toMatchObject({ state: 'IDLE', result: null, events: [] });
  });
  it('provides no overlay access without a capability and keeps the capability out of snapshots', async () => {
    const keyResponse = await fetch(`${origin}/api/game/overlay-key`, { headers: { Cookie: cookie } }); const { key } = await keyResponse.json() as { key: string };
    expect(key).toMatch(/^[\w-]{43}$/); expect(JSON.stringify(session)).not.toContain(key);
    expect((await fetch(`${origin}/api/overlay`)).status).toBe(401); expect((await fetch(`${origin}/api/overlay/events`, { headers: { Authorization: 'Bearer ' + 'x'.repeat(43) } })).status).toBe(401);
    await simulate(); const response = await fetch(`${origin}/api/overlay`, { headers: { Authorization: `Bearer ${key}` } }); const overlay: unknown = await response.json();
    expect(isOverlaySnapshot(overlay)).toBe(true); expect(overlay).toMatchObject({ origin: 'simulation', game: { inputs: [], state: 'COUNTDOWN' } });
    expect(JSON.stringify(overlay)).not.toMatch(/csrf|accessToken|userId|overlayKey/);
    expect((await fetch(`${origin}/api/game/pause`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, Origin: allowed, 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(401);
    expect((await fetch(`${origin}/api/overlay`, { headers: { Authorization: `Bearer ${key}`, Origin: 'https://evil.test' } })).status).toBe(403);
    expect((await fetch(`${origin}/api/overlay`, { method: 'POST', headers: { Authorization: `Bearer ${key}` } })).status).toBe(401);
  });
  it('streams synchronized safe state with no buffering, isolates rooms and rotates overlay access', async () => {
    const { key } = await (await fetch(`${origin}/api/game/overlay-key`, { headers: { Cookie: cookie } })).json() as { key: string };
    const abort = new AbortController(); const response = await fetch(`${origin}/api/overlay/events`, { headers: { Authorization: `Bearer ${key}` }, signal: abort.signal });
    expect(response.headers.get('cache-control')).toContain('no-transform'); const reader = response.body!.getReader();
    try {
      await simulate(); let output = '';
      while (!output.includes('"state":"COUNTDOWN"')) { const next = await reader.read(); if (next.done) throw new Error('No game snapshot'); output += new TextDecoder().decode(next.value); }
      expect(output).toContain('event: game.snapshot'); expect(output).toContain('"source":"simulation"');
    } finally { abort.abort(); await reader.cancel().catch(() => {}); }
    const other = await (await fetch(`${origin}/api/session`)).json() as SessionView; expect(other.snapshot.game!.state).toBe('IDLE');
    app.runtime.room(app.runtime.repository.get(readSessionCookie(cookie))!).rotateStreams();
    expect((await fetch(`${origin}/api/overlay`, { headers: { Authorization: `Bearer ${key}` } })).status).toBe(401);
  });
  it('bounds manual simulation inputs and refuses them outside an active simulation', async () => {
    expect((await post('test-input', { team: 'coral', viewer: 'a', count: 1 })).status).toBe(409);
    await simulate(); expect((await post('test-input', { team: 'coral', viewer: 'a', count: 13 })).status).toBe(422);
    expect((await post('test-input', { team: 'coral', viewer: '<bad>', count: 1 })).status).toBe(422);
    expect((await post('test-input', { team: 'coral', viewer: 'a', count: 1 })).status).toBe(409);
  });
});

describe('persistent clock and Twitch interruptions', () => {
  afterEach(() => vi.useRealTimers());
  it('steps without browser frames, publishes at 10 Hz and pauses explicitly on server stalls', () => {
    vi.useFakeTimers(); let now = 0; const publish = vi.fn(); const controller = new GameController(publish, () => {}, () => now);
    try {
      controller.prepare(DEFAULT_CONFIG, 'simulation', 'simulation-channel'); controller.start(); publish.mockClear();
      for (let n = 0; n < 150; n++) { now += 20; controller.pump(); }
      expect(controller.engine.state).toBe('ACTIVE'); expect(publish).toHaveBeenCalledTimes(30);
      now += 1100; controller.pump(); expect(controller.engine.snapshot()).toMatchObject({ state: 'PAUSED', pauseReason: 'server_lag', elapsedMs: 0 });
      for (let n = 0; n < 3000; n++) { now += 20; controller.pump(); }
      expect(controller.engine.snapshot().result?.reason).toBe('abandoned');
    } finally { controller.close(); }
  });
  it('applies fixture EventSub input, freezes on loss, preserves fairness on reconnect and requires resume', async () => {
    vi.useFakeTimers(); const repository = new SessionRepository('unused'); const { record } = repository.create(); authorize(record);
    const sockets: FakeSocket[] = []; const room = new ArenaRoom(record, repository, testConfig(), gateway(), () => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
    try {
      await room.connect(); sockets[0]!.receive(welcome()); await vi.advanceTimersByTimeAsync(1);
      room.prepareGame(DEFAULT_CONFIG); room.game.start(); await vi.advanceTimersByTimeAsync(3100);
      expect(room.snapshot().game?.state).toBe('ACTIVE'); sockets[0]!.receive(notification()); await vi.advanceTimersByTimeAsync(200);
      const before = room.snapshot().game!; expect(before.teams.coral.contributions).toBe(1); expect(before.position).toBeLessThan(0);
      sockets[0]!.lose(); expect(room.snapshot().game).toMatchObject({ state: 'PAUSED', pauseReason: 'connection_lost' });
      await vi.advanceTimersByTimeAsync(1200); expect(room.snapshot().game?.position).toBe(before.position);
      sockets[1]!.receive(welcome('session-2')); await vi.advanceTimersByTimeAsync(1); expect(room.snapshot().state).toBe('connected'); expect(room.snapshot().game?.state).toBe('PAUSED');
      room.game.resume(); sockets[1]!.receive(notification('chat-1', '!coral', 'session-2')); sockets[1]!.receive(notification('switch-attempt', '!mint', 'session-2')); await vi.advanceTimersByTimeAsync(100);
      expect(room.snapshot().game?.teams.coral.contributions).toBe(1); expect(room.snapshot().game?.diagnostics.reasons.team_locked).toBe(1); expect(room.snapshot().counters.duplicates).toBeGreaterThan(0);
      sockets[1]!.receive(frame('session_keepalive', {})); expect(room.snapshot().evidence.origin).toBe('test_fixture');
    } finally { room.close(); }
  });
  it('prevents simulated controls from injecting live-channel contributions', async () => {
    const repository = new SessionRepository('unused'); const { record } = repository.create(); authorize(record);
    const sockets: FakeSocket[] = []; const room = new ArenaRoom(record, repository, testConfig(), gateway(), () => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
    try {
      await room.connect(); sockets[0]!.receive(welcome()); await new Promise(resolve => setTimeout(resolve, 0));
      room.prepareGame(DEFAULT_CONFIG); expect(() => room.testPull('coral', 10, 'forged')).toThrow();
      room.game.start(); await expect(room.setCommands({ coral: '!changed', mint: '!mint' })).rejects.toMatchObject({ status: 409 });
      room.startSimulation(); expect(room.snapshot().game?.result?.reason).toBe('abandoned');
    } finally { room.close(); }
  });
});
