import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createArenaServer } from '../../apps/realtime/src/server';
import { readSessionCookie, SessionRepository, SESSION_ROTATION_WINDOW_MS } from '../../apps/realtime/src/sessions';
import type { SessionView } from '../../packages/contracts/src/index';
import { testConfig } from '../helpers/twitch';

describe('release security and bounded transport', () => {
  let app: Awaited<ReturnType<typeof createArenaServer>>, base: string, cookie: string, view: SessionView;
  const origin = 'http://127.0.0.1:3000';
  const streams: AbortController[] = [];
  beforeEach(async () => {
    app = await createArenaServer(testConfig(false)); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/api/session`); cookie = response.headers.get('set-cookie')!.split(';')[0]!; view = await response.json() as SessionView;
  });
  afterEach(async () => { for (const stream of streams.splice(0)) stream.abort(); await app.close(); });
  const headers = () => ({ Cookie: cookie, Origin: origin, 'X-CSRF-Token': view.csrfToken, 'Content-Type': 'application/json' });
  const post = (path: string, body = '{}') => fetch(`${base}/api/${path}`, { method: 'POST', headers: headers(), body, redirect: 'manual' });

  it('does not grant any privileged action to a public overlay capability', async () => {
    const { key } = await (await fetch(`${base}/api/game/overlay-key`, { headers: { Cookie: cookie } })).json() as { key: string };
    const paths = ['auth/twitch/start', 'twitch/reconnect', 'twitch/disconnect', 'simulation/start', 'simulation/stop', 'commands', 'evidence/ack', ...['prepare','start','pause','resume','abandon','reset','rematch','simulate','test-input','finish','configure','commit','rehearse','rehearsal-check'].map(action => `game/${action}`)];
    for (const path of paths) {
      const response = await fetch(`${base}/api/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, Origin: origin, 'Content-Type': 'application/json' }, body: '{}', redirect: 'manual' });
      expect(response.status, path).toBe(401);
    }
    expect((await fetch(`${base}/api/overlay`, { headers: { Authorization: `Bearer ${key}` } })).status).toBe(200);
    expect((await fetch(`${base}/api/evidence`, { headers: { Cookie: cookie } })).status).toBe(409);
  });

  it('rejects missing Origin, cross-site streams, malformed JSON and oversized bodies without changing commands', async () => {
    const { Origin: _origin, ...withoutOrigin } = headers(); void _origin;
    expect((await fetch(`${base}/api/commands`, { method: 'POST', headers: withoutOrigin, body: '{}' })).status).toBe(403);
    expect((await fetch(`${base}/api/events`, { headers: { Cookie: cookie, 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await post('commands', '{')).status).toBe(400);
    expect((await post('commands', JSON.stringify({ coral: 'x'.repeat(5000), mint: '!mint' }))).status).toBe(413);
    const after = await (await fetch(`${base}/api/session`, { headers: { Cookie: cookie } })).json() as SessionView;
    expect(after.snapshot.commands).toEqual(view.snapshot.commands);
    expect((await post('commands', JSON.stringify({ coral: '!valid', mint: '!other' }))).status).toBe(200);
  });

  it('enforces the 30 actions/minute budget and keeps the last accepted settings', async () => {
    for (let i = 0; i < 30; i++) expect((await post('commands', JSON.stringify({ coral: `!a${i}`, mint: '!mint' }))).status).toBe(200);
    const limited = await post('commands', JSON.stringify({ coral: '!blocked', mint: '!mint' }));
    expect(limited.status).toBe(429); expect(await limited.json()).toEqual({ error: 'rate_limited' });
    const after = await (await fetch(`${base}/api/session`, { headers: { Cookie: cookie } })).json() as SessionView;
    expect(after.snapshot.commands.coral).toBe('!a29');
  });

  it('limits each stream class to six clients and releases capacity when clients close', async () => {
    const { key } = await (await fetch(`${base}/api/game/overlay-key`, { headers: { Cookie: cookie } })).json() as { key: string };
    for (const [path, auth] of [['events', { Cookie: cookie }], ['overlay/events', { Authorization: `Bearer ${key}` }]] as const) {
      const opened: AbortController[] = [];
      for (let i = 0; i < 6; i++) {
        const abort = new AbortController(); streams.push(abort); opened.push(abort);
        const response = await fetch(`${base}/api/${path}`, { headers: auth, signal: abort.signal });
        expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-transform');
      }
      expect((await fetch(`${base}/api/${path}`, { headers: auth })).status).toBe(429);
      opened[0]!.abort(); await new Promise(resolve => setTimeout(resolve, 20));
      const replacement = new AbortController(); streams.push(replacement);
      expect((await fetch(`${base}/api/${path}`, { headers: auth, signal: replacement.signal })).status).toBe(200);
      for (const abort of opened) abort.abort(); replacement.abort();
    }
  });

  it('rechecks cookie and CSRF after waiting for a session lock', async () => {
    const record = app.runtime.repository.get(readSessionCookie(cookie))!;
    let release!: () => void, queued!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const arrived = new Promise<void>(resolve => { queued = resolve; });
    const exclusive = app.runtime.exclusive.bind(app.runtime);
    const holding = exclusive(record, async () => { await held; app.runtime.repository.rotate(record); });
    // Observe entry into the real lock, rather than hoping a network delay is long enough.
    app.runtime.exclusive = (target, operation) => { queued(); return exclusive(target, operation); };
    try {
      const request = post('commands', JSON.stringify({ coral: '!stale', mint: '!mint' }));
      await arrived; release(); await holding;
      expect((await request).status).toBe(403); expect(record.commands.coral).toBe('!coral');
      expect((await fetch(`${base}/api/events`, { headers: { Cookie: cookie } })).status).toBe(401);
    } finally { release(); }
  });

  it('does not overwrite a rotating cookie when an early stream reset bootstraps with its old cookie', async () => {
    const record = app.runtime.repository.get(readSessionCookie(cookie))!;
    const rotated = app.runtime.repository.rotate(record);
    const pending = await fetch(`${base}/api/session`, { headers: { Cookie: cookie } });
    expect(pending.status).toBe(409);
    expect(await pending.json()).toEqual({ error: 'session_rotating' });
    expect(pending.headers.get('set-cookie')).toBeNull();
    const staleCallback = await fetch(`${base}/api/auth/twitch/callback?state=old&code=old`, { headers: { Cookie: cookie }, redirect: 'manual' });
    expect(staleCallback.status).toBe(303);
    expect(staleCallback.headers.get('set-cookie')).toBeNull();
    expect((await fetch(`${base}/api/events`, { headers: { Cookie: cookie } })).status).toBe(401);
    const current = await fetch(`${base}/api/session`, { headers: { Cookie: `cta_session=${rotated}` } });
    expect(current.status).toBe(200);
    expect((await current.json() as SessionView).csrfToken).toBe(record.csrf);
    expect(app.runtime.repository.records.size).toBe(1);
  });
});

it('bounds rotation markers without reviving old session authority and expires them', () => {
  let now = 0;
  const repository = new SessionRepository('unused', undefined, () => now);
  const { raw: first, record } = repository.create();
  let current = first, previous = first;
  for (let n = 0; n < 300; n++) { previous = current; current = repository.rotate(record); }
  expect(repository.records.size).toBe(1);
  expect(repository.get(first)).toBeUndefined();
  expect(repository.get(previous)).toBeUndefined();
  expect(repository.recentlyRotated(first)).toBe(false);
  expect(repository.recentlyRotated(previous)).toBe(true);
  expect(repository.get(current)).toBe(record);
  now += SESSION_ROTATION_WINDOW_MS;
  expect(repository.recentlyRotated(previous)).toBe(false);
  expect(repository.get(previous)).toBeUndefined();
});
