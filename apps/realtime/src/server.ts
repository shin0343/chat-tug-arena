import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { validateKeywords, validateShowdownConfig, normalizeKeywords, hasShowdown, isRecord, isRoundConfig, GAME_SCENARIOS, type GameScenario, type SessionView } from '@chat-tug/contracts';
import { readConfig, type ServerConfig } from './config.js';
import { ArenaRuntime, type RuntimeDependencies } from './runtime.js';
import { readSessionCookie, sessionCookie, equalSecret, type SessionRecord } from './sessions.js';
import { ServiceError } from './errors.js';
import { openEventStream } from './sse.js';
function json(response: ServerResponse, status: number, body: unknown) { response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body)); }
async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  if (Number(request.headers['content-length'] ?? 0) > 4096) throw new ServiceError('provider_unavailable', 413);
  for await (const chunk of request) {
    size += Buffer.byteLength(chunk); if (size > 4096) throw new ServiceError('provider_unavailable', 413); chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    if (request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
    if (!text) return {};
    if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('type');
    return JSON.parse(text) as unknown;
  } catch { throw new ServiceError('provider_unavailable', 400); }
}
export async function createArenaServer(config: ServerConfig = readConfig(), dependencies: RuntimeDependencies = {}) {
  const runtime = new ArenaRuntime(config, dependencies); await runtime.initialize();
  const actionLimits = new WeakMap<SessionRecord, { until: number; count: number }>();
  const view = (record: SessionRecord): SessionView => ({ csrfToken: record.csrf, snapshot: runtime.room(record).snapshot() });
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store'); response.setHeader('Vary', 'Cookie');
    response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer');
    void handle(request, response).catch(error => {
      if (response.headersSent) { response.end(); return; }
      const safe = error instanceof ServiceError ? error : new ServiceError('provider_unavailable');
      json(response, safe.status, { error: safe.code });
    });
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000;
  server.on('upgrade', (_request, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
  async function handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? '/', 'http://internal'); const path = url.pathname;
    if (request.method === 'GET' && path === '/health') {
      json(response, 200, { service: 'chat-tug-realtime', protocolVersion: 2, phase: 'game-engine', acceptingRounds: true, twitchConfigured: Boolean(config.clientId && config.clientSecret) }); return;
    }
    if (!path.startsWith('/api/')) { json(response, 404, { error: 'not_found' }); return; }
    if (request.method === 'GET' && (path === '/api/overlay' || path === '/api/overlay/events')) {
      response.setHeader('Vary', 'Authorization');
      const authorization = request.headers.authorization;
      const key = authorization?.match(/^Bearer ([\w-]{43})$/)?.[1];
      const publicRoom = key && runtime.overlay(key);
      if (!publicRoom) throw new ServiceError('token_invalid', 401);
      if (request.headers.origin && request.headers.origin !== config.appOrigin) throw new ServiceError('token_invalid', 403);
      if (path === '/api/overlay') { json(response, 200, publicRoom.overlaySnapshot()); return; }
      openEventStream(response, (send, reset) => publicRoom.subscribeOverlay(snapshot => send(`id: ${snapshot.revision}\nevent: game.snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`), reset)); return;
    }
    const rawCookie = readSessionCookie(request.headers.cookie);
    let record = runtime.repository.get(rawCookie);
    if (request.method === 'GET' && (path === '/api/session' || path === '/api/auth/twitch/callback')) {
      // A reset can arrive before another response's rotated Set-Cookie. Never
      // overwrite that incoming cookie with a newly created anonymous session.
      if (!record && runtime.repository.recentlyRotated(rawCookie)) {
        if (path === '/api/session') json(response, 409, { error: 'session_rotating' });
        else response.writeHead(303, { Location: `${config.appOrigin}/dashboard/connection` }).end();
        return;
      }
      if (!record) { const created = runtime.repository.create(); record = created.record; response.setHeader('Set-Cookie', sessionCookie(created.raw, config.secureCookie)); }
      if (path === '/api/session') { json(response, 200, view(record)); return; }
      let raw: string | undefined;
      try { raw = await runtime.exclusive(record, () => runtime.callback(record!, url.searchParams)); }
      catch { runtime.room(record).showNotice('storage_unavailable'); }
      if (raw) response.setHeader('Set-Cookie', sessionCookie(raw, config.secureCookie));
      response.writeHead(303, { Location: `${config.appOrigin}/dashboard/connection` }).end(); return;
    }
    if (!record) throw new ServiceError('token_invalid', 401);
    const room = runtime.room(record);
    if (request.method === 'GET' && path === '/api/game/overlay-key') { json(response, 200, { key: room.overlayKey }); return; }
    if (request.method === 'GET' && path === '/api/events') {
      if ((request.headers.origin && request.headers.origin !== config.appOrigin) || request.headers['sec-fetch-site'] === 'cross-site') throw new ServiceError('token_invalid', 403);
      // Compression buffers small SSE frames. Preserve immediate delivery through Next/proxies.
      openEventStream(response, (send, reset) => room.subscribe(snapshot => send(`id: ${snapshot.revision}\nevent: connection.snapshot\ndata: ${JSON.stringify({ type: 'connection.snapshot', snapshot })}\n\n`), reset), 'event: session.reset\ndata: {}\n\n'); return;
    }
    if (request.method === 'GET' && path === '/api/evidence') {
      const snapshot = room.snapshot();
      if (snapshot.state !== 'connected' || snapshot.mode !== 'twitch' || snapshot.evidence.origin !== 'twitch' || !snapshot.evidence.liveMessageReceivedAt || !snapshot.evidence.eventId || room.delivery?.eventId !== snapshot.evidence.eventId) { json(response, 409, { exitGate: 'BLOCKED', reason: 'No real Twitch team input has been acknowledged by this session’s client.' }); return; }
      response.setHeader('Content-Disposition', 'attachment; filename="chat-tug-twitch-evidence.json"');
      json(response, 200, { exitGate: 'PASSED', capturedAt: new Date().toISOString(), channel: snapshot.channel, protocolVersion: snapshot.protocolVersion, pipeline: 'Twitch EventSub → normalized chat → exact command → game.input → session SSE → client acknowledgement', eventId: snapshot.evidence.eventId, receivedAt: snapshot.evidence.liveMessageReceivedAt, clientReceivedAt: room.delivery.clientReceivedAt, source: 'twitch', recognizedInputs: snapshot.counters.recognized }); return;
    }
    const gameActions = ['prepare', 'start', 'pause', 'resume', 'abandon', 'reset', 'rematch', 'simulate', 'test-input', 'finish', 'configure', 'commit', 'rehearse', 'rehearsal-check'].map(action => `/api/game/${action}`);
    const actions = ['/api/auth/twitch/start', '/api/twitch/reconnect', '/api/twitch/disconnect', '/api/simulation/start', '/api/simulation/stop', '/api/commands', '/api/evidence/ack', ...gameActions];
    if (request.method !== 'POST' || !actions.includes(path)) { json(response, 404, { error: 'not_found' }); return; }
    if (request.headers.origin !== config.appOrigin) throw new ServiceError('token_invalid', 403);
    const payload = await body(request);
    const csrf = typeof request.headers['x-csrf-token'] === 'string' ? request.headers['x-csrf-token'] : (payload && typeof payload === 'object' && 'csrf' in payload ? payload.csrf : undefined);
    if (typeof csrf !== 'string' || csrf.length > 128 || !equalSecret(csrf, record.csrf)) throw new ServiceError('token_invalid', 403);
    const limit = actionLimits.get(record);
    if (limit && limit.until > Date.now()) { if (++limit.count > 30) throw new ServiceError('rate_limited', 429); }
    else actionLimits.set(record, { until: Date.now() + 60_000, count: 1 });
    await runtime.exclusive(record, async () => {
      // A queued request must not survive cookie/CSRF rotation while waiting for the session lock.
      if (runtime.repository.get(readSessionCookie(request.headers.cookie)) !== record || !equalSecret(csrf, record!.csrf)) throw new ServiceError('token_invalid', 403);
      if (gameActions.includes(path)) {
        room.game.pump();
        if (!isRecord(payload) || !room.game.matches(payload.roundId, payload.expectedState)) { json(response, 409, { error: 'round_conflict' }); return; }
        const state = room.game.engine.state;
        // A decided showdown cannot be replaced through a legacy control or simulation endpoint either.
        room.snapshot();
        if (['prepare', 'simulate', 'reset', 'rematch', 'configure', 'rehearse'].some(name => path === `/api/game/${name}`) && room.showdowns.pending) { json(response, 409, { error: 'consequence_pending' }); return; }
        if (path === '/api/game/configure') {
          if (!['IDLE', 'READY', 'FINISHED'].includes(state)) { json(response, 409, { error: 'round_conflict' }); return; }
          if (!room.matchesSettings(payload.settingsRevision)) { json(response, 409, { error: 'settings_conflict' }); return; }
          const fields = { ...validateShowdownConfig(payload.config), ...Object.fromEntries(Object.entries(validateKeywords(payload.commands)).map(([key, message]) => [`${key}Keyword`, message])) };
          if (!isRoundConfig(payload.config) || !hasShowdown(payload.config) || Object.keys(fields).length || !isRecord(payload.commands)) { json(response, 422, { error: 'invalid_showdown', fields }); return; }
          await room.configureShowdown(payload.config, normalizeKeywords(payload.commands as unknown as { coral: string; mint: string }));
        } else if (path === '/api/game/commit') {
          if (state !== 'FINISHED' || !room.showdowns.commit(room.game.engine.roundId)) { json(response, 409, { error: 'round_conflict' }); return; }
          room.publish();
        } else if (path === '/api/game/rehearse') {
          if (!['IDLE', 'READY', 'FINISHED'].includes(state) || !room.snapshot().showdown?.configured) { json(response, 409, { error: 'round_conflict' }); return; }
          room.rehearsal();
        } else if (path === '/api/game/rehearsal-check') {
          room.rehearsalCheck();
        } else if (path === '/api/game/prepare' || path === '/api/game/simulate') {
          if (!['IDLE', 'READY', 'FINISHED'].includes(state)) { json(response, 409, { error: 'round_conflict' }); return; }
          if (!isRoundConfig(payload.config)) { json(response, 422, { error: 'invalid_round' }); return; }
          if (path.endsWith('/prepare')) room.prepareGame(payload.config);
          else {
            if (!GAME_SCENARIOS.includes(payload.scenario as GameScenario) || !Number.isSafeInteger(payload.seed) || Number(payload.seed) < 0 || Number(payload.seed) > 0xffffffff) { json(response, 422, { error: 'invalid_scenario' }); return; }
            room.runScenario(payload.scenario as GameScenario, Number(payload.seed), payload.config);
          }
        } else if (path === '/api/game/test-input') {
          if (!['coral', 'mint'].includes(String(payload.team)) || !Number.isInteger(payload.count) || Number(payload.count) < 1 || Number(payload.count) > 12 || typeof payload.viewer !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(payload.viewer)) { json(response, 422, { error: 'invalid_test_input' }); return; }
          room.testPull(payload.team as 'coral' | 'mint', Number(payload.count), payload.viewer);
        } else if (path === '/api/game/reset') {
          if (!['IDLE', 'READY', 'FINISHED'].includes(state)) { json(response, 409, { error: 'round_conflict' }); return; }
          room.game.reset();
        } else if (path === '/api/game/rematch') {
          if (state !== 'FINISHED') { json(response, 409, { error: 'round_conflict' }); return; }
          room.prepareGame(room.game.engine.config); if (room.startReady()) room.game.start();
        } else {
          if ((path.endsWith('/start') || path.endsWith('/resume')) && !room.canPlay()) { json(response, 409, { error: 'connection_required' }); return; }
          if (path.endsWith('/start') && !room.startReady()) { json(response, 409, { error: 'chat_check_required' }); return; }
          const changed = path.endsWith('/start') ? room.game.start() : path.endsWith('/pause') ? room.game.pause() : path.endsWith('/resume') ? room.game.resume() : path.endsWith('/finish') ? room.game.finish() : room.game.abandon();
          if (!changed) { json(response, 409, { error: 'round_conflict' }); return; }
        }
        json(response, 200, view(record!)); return;
      }
      if (path === '/api/auth/twitch/start') { response.writeHead(303, { Location: await runtime.authorize(record!) }).end(); return; }
      if (path === '/api/twitch/disconnect') response.setHeader('Set-Cookie', sessionCookie(await runtime.disconnect(record!), config.secureCookie));
      else if (path === '/api/twitch/reconnect') { void room.connect(); }
      else if (path === '/api/simulation/start') room.startSimulation();
      else if (path === '/api/simulation/stop') room.stopSimulation();
      else if (path === '/api/evidence/ack') {
        const id = payload && typeof payload === 'object' && 'eventId' in payload ? payload.eventId : null;
        json(response, room.acknowledgeInput(id) ? 200 : 409, { acknowledged: Boolean(room.delivery) }); return;
      }
      else if (path === '/api/commands') {
        const errors = validateKeywords(payload);
        if (Object.keys(errors).length) { json(response, 422, { error: 'invalid_commands', fields: errors }); return; }
        await runtime.commands(record!, payload);
      }
      json(response, 200, view(record!));
    });
  }
  return { server, runtime, async close() {
    try { await runtime.close(); }
    finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  } };
}
