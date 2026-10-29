import { isTeamKeywords, normalizeKeywords } from '@chat-tug/contracts';
import type { ServerConfig } from './config.js';
import type { SocketFactory } from './eventsub.js';
import { ArenaRoom } from './room.js';
import { SessionRepository, digest, equalSecret, secret, type SessionRecord } from './sessions.js';
import { TwitchApi, type TwitchGateway } from './twitch-api.js';
import { issueFrom, ServiceError } from './errors.js';
export interface RuntimeDependencies { api?: TwitchGateway; socketFactory?: SocketFactory; repository?: SessionRepository; }
export class ArenaRuntime {
  readonly repository: SessionRepository;
  readonly api: TwitchGateway;
  private readonly rooms = new Map<SessionRecord, ArenaRoom>();
  private readonly locks = new WeakMap<SessionRecord, Promise<unknown>>();
  private readonly authRequests = new Set<AbortController>();
  private cleanup?: ReturnType<typeof setInterval>;
  private stopped = false;
  constructor(readonly config: ServerConfig, private readonly dependencies: RuntimeDependencies = {}) {
    this.repository = dependencies.repository ?? new SessionRepository(config.dataDirectory, config.encryptionKey);
    this.api = dependencies.api ?? new TwitchApi(config);
  }
  async initialize() {
    await this.repository.load();
    for (const record of this.repository.records.values()) if (record.authorization) void this.room(record).connect();
    this.cleanup = setInterval(() => {
      for (const [key, record] of this.repository.records) if (record.expiresAt <= Date.now()) {
        this.rooms.get(record)?.close(); this.rooms.delete(record); this.repository.records.delete(key);
      }
    }, 60_000);
    this.cleanup.unref?.();
  }
  room(record: SessionRecord) {
    let room = this.rooms.get(record);
    if (!room) { room = new ArenaRoom(record, this.repository, this.config, this.api, this.dependencies.socketFactory); this.rooms.set(record, room); }
    return room;
  }
  overlay(key: string) {
    for (const [record, room] of this.rooms) if (record.expiresAt > Date.now() && equalSecret(room.overlayKey, key)) return room;
    return undefined;
  }
  async exclusive<T>(record: SessionRecord, action: () => Promise<T> | T): Promise<T> {
    const previous = this.locks.get(record) ?? Promise.resolve();
    const pending = previous.catch(() => {}).then(() => { if (this.stopped) throw new ServiceError('server_shutdown', 503); return action(); });
    this.locks.set(record, pending);
    try { return await pending; } finally { if (this.locks.get(record) === pending) this.locks.delete(record); }
  }
  async authorize(record: SessionRecord) {
    if (!this.config.clientId || !this.config.clientSecret) throw new ServiceError('credentials_missing', 503);
    const state = secret(); record.oauth = { stateDigest: digest(state), expiresAt: Date.now() + 10 * 60_000 };
    this.room(record).authorizationPending(); await this.repository.save(); return this.api.authorizeUrl(state);
  }
  async callback(record: SessionRecord, query: URLSearchParams): Promise<string | undefined> {
    const pending = record.oauth;
    const state = query.get('state');
    if (!pending || pending.expiresAt <= Date.now() || query.getAll('state').length !== 1 || !state || state.length > 256 || !equalSecret(pending.stateDigest, digest(state))) {
      this.room(record).showNotice('oauth_state_invalid'); return;
    }
    delete record.oauth; await this.repository.save();
    if (query.has('error')) { this.room(record).fail('oauth_denied'); return; }
    const code = query.get('code');
    if (!code || code.length > 2048 || query.getAll('code').length !== 1) { this.room(record).fail('oauth_exchange_failed'); return; }
    const abort = new AbortController(); this.authRequests.add(abort);
    try {
      const tokens = await this.api.exchange(code, abort.signal);
      const validated = await this.api.validate(tokens.accessToken, abort.signal);
      const channel = await this.api.identity(tokens.accessToken, validated.userId, abort.signal);
      if (this.stopped || channel.id !== validated.userId || channel.login.toLowerCase() !== validated.login.toLowerCase()) throw new ServiceError('token_invalid', 401);
      const previous = { digest: record.digest, csrf: record.csrf, expiresAt: record.expiresAt, authorization: record.authorization };
      record.authorization = { tokens: { ...tokens, scopes: validated.scopes }, channel };
      const raw = this.repository.rotate(record);
      try { await this.repository.save(); }
      catch (error) {
        this.repository.records.delete(record.digest); Object.assign(record, previous);
        this.repository.records.set(record.digest, record);
        try { await this.api.revoke(tokens.accessToken); } catch { /* Uncommitted credentials stay private. */ }
        throw error;
      }
      this.room(record).rotateStreams(); void this.room(record).connect(); return raw;
    } catch (error) {
      if (!this.stopped) this.room(record).fail(issueFrom(error));
    } finally { this.authRequests.delete(abort); }
  }
  async disconnect(record: SessionRecord) {
    const token = record.authorization?.tokens.accessToken;
    this.room(record).disconnected(); this.room(record).rotateStreams();
    delete record.authorization; delete record.oauth;
    const raw = this.repository.rotate(record);
    try { await this.repository.save(); } catch { this.room(record).showNotice('storage_unavailable'); }
    if (token) { try { await this.api.revoke(token); } catch { this.room(record).showNotice('revocation_unconfirmed'); } }
    return raw;
  }
  async commands(record: SessionRecord, value: unknown) {
    if (!isTeamKeywords(value)) throw new ServiceError('provider_unavailable', 400);
    await this.room(record).setCommands(normalizeKeywords(value));
  }
  async close() {
    this.stopped = true; clearInterval(this.cleanup);
    for (const abort of this.authRequests) abort.abort();
    for (const room of this.rooms.values()) room.close();
    await this.repository.close();
  }
}
