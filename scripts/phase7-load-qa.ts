import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { DEFAULT_CONFIG, type ConnectionSnapshot, type OverlaySnapshot } from '../packages/contracts/src/index.js';
import { readConfig } from '../apps/realtime/src/config.js';
import type { EventSocket } from '../apps/realtime/src/eventsub.js';
import { createArenaServer } from '../apps/realtime/src/server.js';
import type { TwitchGateway } from '../apps/realtime/src/twitch-api.js';

// Local EventSub fixture → real normalizer/engine → HTTP SSE clients.
// No external Twitch account, game input endpoint or production fake-auth route.
const directory = process.env.QA_OUTPUT_DIRECTORY ?? 'docs/qa/phase7';
const soakMs = Number(process.env.QA_SOAK_MS ?? 120_000);
assert(Number.isFinite(soakMs) && soakMs >= 90_000 && soakMs <= 600_000);
class FixtureSocket extends EventEmitter implements EventSocket {
  receive(frame: unknown) { this.emit('message', Buffer.from(JSON.stringify(frame)), false); }
  close() { this.emit('close', 1000); }
  terminate() { /* no external resource in this fixture */ }
  lose() { this.emit('close', 4005); }
}
const sockets: FixtureSocket[] = [];
let subscriptions = 0, envelope = 0, message = 0, sessionId = 'load-session-1';
const channel = { id: '123', login: 'fixture_broadcaster', displayName: 'Fixture broadcaster' };
const tokens = () => ({ accessToken: 'fixture-access-only', refreshToken: 'fixture-refresh-only', scopes: ['user:read:chat'], expiresAt: Date.now() + 3_600_000 });
const api: TwitchGateway = {
  origin: 'test_fixture', authorizeUrl: () => 'https://id.twitch.tv/oauth2/authorize',
  exchange: async () => tokens(), refresh: async () => tokens(),
  validate: async () => ({ userId: channel.id, login: channel.login, scopes: ['user:read:chat'], expiresIn: 3600 }),
  identity: async () => channel, subscribe: async () => { subscriptions++; return 'load-subscription'; }, revoke: async () => {},
};
const app = await createArenaServer(readConfig({ APP_ORIGIN: 'http://127.0.0.1:3000', TWITCH_CLIENT_ID: 'fixture-client', TWITCH_CLIENT_SECRET: 'fixture-secret' }), { api, socketFactory: () => { const socket = new FixtureSocket(); sockets.push(socket); return socket; } });
app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
const { record, raw } = app.runtime.repository.create(); record.authorization = { tokens: tokens(), channel };
const room = app.runtime.room(record);
const frame = (type: string, payload: unknown) => ({ metadata: { message_id: `load-envelope-${++envelope}`, message_type: type, message_timestamp: new Date().toISOString(), ...(type === 'notification' ? { subscription_type: 'channel.chat.message', subscription_version: '1' } : {}) }, payload });
const welcome = () => frame('session_welcome', { session: { id: sessionId, status: 'connected', keepalive_timeout_seconds: 10 } });
const waits = async (condition: () => boolean, timeout = 5000) => { const start = performance.now(); while (!condition()) { assert(performance.now() - start < timeout, 'Local load precondition timed out'); await delay(10); } };
const processingMs: number[] = [], observedDeliveryMs: number[] = [];
const pending = new Map<string, number>();
let attempted = 0;
function inject(user: string, text: string, id = `load-message-${++message}`) {
  const notification = frame('notification', { subscription: { id: 'load-subscription', type: 'channel.chat.message', version: '1', status: 'enabled', condition: { broadcaster_user_id: '123', user_id: '123' }, transport: { method: 'websocket', session_id: sessionId } }, event: { message_id: id, broadcaster_user_id: '123', chatter_user_id: user, chatter_user_name: 'Load viewer', message: { text } } });
  pending.set(`twitch:123:${id}`, performance.now());
  if (pending.size > 1000) pending.delete(pending.keys().next().value!);
  const before = performance.now(); sockets.at(-1)!.receive(notification); processingMs.push(performance.now() - before); attempted++;
}
const streamErrors: string[] = [];
const clients: { abort: AbortController; task: Promise<void>; stats: { kind: string; bytes: number; snapshots: number; maxGapMs: number; lastAt: number; firstSnapshotMs: number | null } }[] = [];
async function stream(kind: 'overlay' | 'dashboard', key: string) {
  const abort = new AbortController(), started = performance.now();
  const response = await fetch(`${base}/api/${kind === 'overlay' ? 'overlay/events' : 'events'}`, { headers: kind === 'overlay' ? { Authorization: `Bearer ${key}` } : { Cookie: `cta_session=${raw}` }, signal: abort.signal });
  assert.equal(response.status, 200); assert(response.headers.get('cache-control')?.includes('no-transform'));
  const stats = { kind, bytes: 0, snapshots: 0, maxGapMs: 0, lastAt: started, firstSnapshotMs: null as number | null };
  const task = (async () => {
    const reader = response.body!.getReader(); const decoder = new TextDecoder(); let buffer = '';
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        stats.bytes += next.value.byteLength; buffer += decoder.decode(next.value, { stream: true });
        assert(buffer.length < 1_000_000, 'SSE parser buffer unexpectedly grew');
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const packet = buffer.slice(0, end); buffer = buffer.slice(end + 2);
          if (!packet.includes('event: game.snapshot') && !packet.includes('event: connection.snapshot')) continue;
          const data = packet.split('\n').find(line => line.startsWith('data: '))?.slice(6); if (!data) continue;
          const at = performance.now(); stats.maxGapMs = Math.max(stats.maxGapMs, at - stats.lastAt); stats.lastAt = at; stats.snapshots++; stats.firstSnapshotMs ??= at - started;
          if (kind === 'overlay') {
            const snapshot = JSON.parse(data) as OverlaySnapshot;
            assert.equal(snapshot.origin, 'test_fixture'); assert.equal(snapshot.game.inputs.length, 0);
            assert(!/csrfToken|accessToken|refreshToken|chatter_user_id|"userId"/.test(data));
          } else {
            const { snapshot } = JSON.parse(data) as { snapshot: ConnectionSnapshot };
            for (const input of snapshot.inputs) {
              const sent = pending.get(input.id); if (sent !== undefined) { observedDeliveryMs.push(at - sent); pending.delete(input.id); }
            }
          }
        }
      }
      if (!abort.signal.aborted) streamErrors.push(`${kind}: unexpected end`);
    } catch (error) { if (!abort.signal.aborted) streamErrors.push(error instanceof Error ? error.message : 'stream error'); }
    finally { await reader.cancel().catch(() => {}); }
  })();
  clients.push({ abort, task, stats });
}
const stages: object[] = [], rounds: object[] = [], memory: object[] = [];
const loop = monitorEventLoopDelay({ resolution: 10 });
const started = performance.now();
let keepalive: ReturnType<typeof setInterval> | undefined, memoryTimer: ReturnType<typeof setInterval> | undefined;
function sampleMemory(stage: string) { globalThis.gc?.(); const { heapUsed, rss, external } = process.memoryUsage(); memory.push({ stage, elapsedMs: performance.now() - started, heapUsed, rss, external }); }
async function activeRound() { room.prepareGame({ ...DEFAULT_CONFIG, durationSeconds: 90 }); assert(room.game.start()); await waits(() => room.game.engine.state === 'ACTIVE'); }
function finishRound(label: string) {
  const state = room.game.engine.snapshot();
  if (state.state === 'ACTIVE' || state.state === 'PAUSED') assert(room.game.finish());
  rounds.push({ label, roundId: state.roundId, state: room.game.engine.state, accepted: state.diagnostics.accepted, rejected: state.diagnostics.rejected, uniqueViewers: state.uniqueViewers, trackedUsers: state.diagnostics.trackedUsers, trackedIds: state.diagnostics.trackedIds, retainedInputs: state.inputs.length, retainedEvents: state.events.length, position: state.position, result: room.game.engine.snapshot().result });
  assert(state.diagnostics.trackedUsers <= 5000 && state.inputs.length <= 40 && state.events.length <= 64);
}
async function continuous(ms: number, prefix: string) {
  const start = performance.now(); let count = 0;
  while (performance.now() - start < ms) {
    inject(`${prefix}-${count % 80}`, count % 2 ? '!mint' : '!coral'); count++;
    await delay(Math.max(0, start + count * 50 - performance.now()));
  }
  stages.push({ stage: prefix, attempted: count, elapsedMs: performance.now() - start, targetMessagesPerSecond: 20 });
}
try {
  await room.connect(); sockets[0]!.receive(welcome()); await waits(() => room.snapshot().state === 'connected');
  keepalive = setInterval(() => sockets.at(-1)!.receive(frame('session_keepalive', {})), 4000);
  for (let i = 0; i < 6; i++) await stream('overlay', room.overlayKey);
  await stream('dashboard', room.overlayKey);
  assert.equal((await fetch(`${base}/api/overlay/events`, { headers: { Authorization: `Bearer ${room.overlayKey}` } })).status, 429);
  sampleMemory('connected'); memoryTimer = setInterval(() => sampleMemory('soak'), 10_000); loop.enable();
  await activeRound(); await continuous(30_000, 'moderate');
  const beforeBurst = room.game.engine.snapshot(), burstStarted = performance.now();
  for (let i = 0; i < 500; i++) inject(`burst-${i}`, i % 2 ? '!mint' : '!coral');
  for (let i = 0; i < 200; i++) inject('duplicate-user', '!coral', 'duplicate-chat-id');
  for (let i = 0; i < 200; i++) inject(`invalid-command-${i}`, '!not-a-command');
  for (let i = 0; i < 100; i++) { sockets.at(-1)!.receive(frame('notification', { event: { invalid: true } })); attempted++; }
  const burstMs = performance.now() - burstStarted; await delay(200);
  const afterBurst = room.game.engine.snapshot();
  stages.push({ stage: '1000-message-burst', elapsedMs: burstMs, accepted: afterBurst.diagnostics.accepted - beforeBurst.diagnostics.accepted, rejected: afterBurst.diagnostics.rejected - beforeBurst.diagnostics.rejected, reasons: afterBurst.diagnostics.reasons });
  const forceBefore = afterBurst.teams.coral.force + afterBurst.teams.mint.force;
  await delay(3000); const forceAfter = room.game.engine.snapshot().teams;
  assert(forceAfter.coral.force + forceAfter.mint.force < forceBefore);
  stages.push({ stage: 'quiet-decay', quietMs: 3000, totalForceBefore: forceBefore, totalForceAfter: forceAfter.coral.force + forceAfter.mint.force });
  const lostAt = performance.now(); sockets.at(-1)!.lose(); const frozen = room.game.engine.snapshot();
  assert.equal(frozen.state, 'PAUSED'); await waits(() => sockets.length === 2);
  sessionId = 'load-session-2'; sockets.at(-1)!.receive(welcome()); await waits(() => room.snapshot().state === 'connected');
  assert.equal(room.game.engine.state, 'PAUSED'); assert.equal(room.game.engine.snapshot().position, frozen.position);
  assert(room.game.resume()); inject('duplicate-user', '!coral', 'duplicate-chat-id');
  stages.push({ stage: 'fixture-reconnect', recoveryMs: performance.now() - lostAt, subscriptions, stateAfterReconnect: 'PAUSED', explicitResume: true, frozenPosition: frozen.position });
  finishRound('moderate-burst-recovery');
  for (let i = 0; i < 8; i++) { await activeRound(); await continuous(1000, `round-${i + 1}`); finishRound(`repeat-${i + 1}`); }
  await activeRound();
  while (performance.now() - started < soakMs) { await continuous(Math.min(5000, soakMs - (performance.now() - started)), 'soak'); if (room.game.engine.snapshot().state === 'FINISHED') { finishRound('soak-auto-finish'); await activeRound(); } }
  finishRound('soak-final'); sampleMemory('finished'); loop.disable();
  assert.equal(room.snapshot().evidence.origin, 'test_fixture'); assert.equal(subscriptions, 2); assert.deepEqual(streamErrors, []);
  assert.equal((await fetch(`${base}/api/evidence`, { headers: { Cookie: `cta_session=${raw}` } })).status, 409);
  const summary = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return { samples: sorted.length, p50Ms: sorted[Math.floor(sorted.length * .5)] ?? 0, p95Ms: sorted[Math.floor(sorted.length * .95)] ?? 0, maximumMs: sorted.at(-1) ?? 0 }; };
  const elapsedMs = performance.now() - started;
  const report = { capturedAt: new Date().toISOString(), runtime: process.version, platform: `${process.platform}/${process.arch}`, scope: '120s default local HTTP/SSE + explicit test_fixture EventSub; not Twitch/network/OBS or production capacity proof', requestedSoakMs: soakMs, elapsedMs, gcAvailable: Boolean(globalThis.gc), attempted, stages, rounds, pipeline: room.snapshot().counters, synchronousEventProcessing: summary(processingMs), observedDashboardDelivery: { ...summary(observedDeliveryMs), limitation: 'Only sampled inputs retained by the 40-item coalesced dashboard feed; not all-message delivery latency' }, clients: clients.map(({ stats }) => ({ ...stats, lastAt: undefined, snapshotsPerSecond: stats.snapshots * 1000 / elapsedMs })), streamErrors, eventLoop: { meanMs: loop.mean / 1e6, p95Ms: loop.percentile(95) / 1e6, maximumMs: loop.max / 1e6 }, memory, limitations: ['One room and one local process; six overlay streams and one dashboard.', '120s is a short soak, not an hours-long real Twitch broadcast.', 'Post-GC samples include V8/HTTP warmup; a finite soak cannot prove absence of leaks.', 'No rendering or native OBS/CEF performance is measured by this script.'] };
  await mkdir(directory, { recursive: true }); await writeFile(`${directory}/load.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ elapsedMs, attempted, rounds: rounds.length, subscriptions, streamErrors, output: `${directory}/load.json` }, null, 2));
} finally {
  clearInterval(keepalive); clearInterval(memoryTimer); loop.disable();
  for (const client of clients) client.abort.abort(); await Promise.all(clients.map(client => client.task)); await app.close();
}
