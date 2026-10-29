import WebSocket from 'ws';
import { isRecord, type ConnectionIssue, type NormalizedChatMessage } from '@chat-tug/contracts';
import { issueFrom } from './errors.js';
import { normalizeTwitchChat, RecentIds } from './pipeline.js';
export interface EventSocket {
  on(event: 'message', listener: (data: { toString(): string }, binary?: boolean) => void): unknown;
  on(event: 'close', listener: (code: number) => void): unknown;
  on(event: 'error', listener: () => void): unknown;
  close(code?: number): void; terminate(): void;
}
export type SocketFactory = (url: string) => EventSocket;
export const twitchSocket: SocketFactory = url => new WebSocket(url, { maxPayload: 65_536, handshakeTimeout: 10_000 });
interface SocketContext {
  socket: EventSocket; abort: AbortController; closed: boolean; welcomed: boolean;
  migration: boolean; sessionId?: string; subscriptionId?: string;
  timer?: ReturnType<typeof setTimeout>; timeoutSeconds: number;
  pending: unknown[];
}
export interface EventSubHooks {
  subscribe(sessionId: string, signal: AbortSignal): Promise<string>;
  onState(state: 'connecting' | 'connected' | 'reconnecting' | 'connection_failed' | 'authorization_expired', issue: ConnectionIssue | null, attempt: number): void;
  onMessage(message: NormalizedChatMessage): void;
  onInvalid(): void; onDuplicate(): void; onHeartbeat(): void;
  onRevoked(issue: ConnectionIssue): void;
}
export function safeReconnectUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try { const u = new URL(value); return u.protocol === 'wss:' && u.hostname === 'eventsub.wss.twitch.tv' && (!u.port || u.port === '443') && u.pathname === '/ws' && !u.username && !u.password && !u.hash; } catch { return false; }
}
export class EventSubConnection {
  private readonly sockets = new Set<SocketContext>();
  private readonly recent = new RecentIds();
  private active?: SocketContext;
  private handoff?: SocketContext;
  private retry?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private attempts = 0;
  constructor(private readonly channelId: string, private readonly hooks: EventSubHooks, private readonly factory: SocketFactory = twitchSocket) {}
  start() { if (this.stopped || this.sockets.size || this.retry) return; this.hooks.onState('connecting', null, 0); this.open('wss://eventsub.wss.twitch.tv/ws', false); }
  private open(url: string, migration: boolean) {
    if (this.stopped) return;
    let socket: EventSocket;
    try { socket = this.factory(url); } catch { this.scheduleRetry(); return; }
    const ctx: SocketContext = { socket, abort: new AbortController(), closed: false, welcomed: false, migration, timeoutSeconds: 10, pending: [] };
    this.sockets.add(ctx);
    if (migration) this.handoff = ctx; else this.active = ctx;
    this.watch(ctx, 10_000);
    socket.on('message', (data, binary) => {
      if (ctx.closed || this.stopped) return;
      if (binary) { this.hooks.onInvalid(); return; }
      let value: unknown;
      const text = data.toString();
      if (Buffer.byteLength(text) > 65_536) { this.hooks.onInvalid(); return; }
      try { value = JSON.parse(text); } catch { this.hooks.onInvalid(); return; }
      void this.message(ctx, value).catch(error => this.fail(ctx, issueFrom(error)));
    });
    socket.on('close', () => this.lost(ctx));
    socket.on('error', () => this.lost(ctx));
  }
  private watch(ctx: SocketContext, ms = (ctx.timeoutSeconds + 2) * 1000) {
    clearTimeout(ctx.timer);
    ctx.timer = setTimeout(() => this.lost(ctx), ms);
    ctx.timer.unref?.();
  }
  private async message(ctx: SocketContext, value: unknown) {
    if (!isRecord(value) || !isRecord(value.metadata) || !isRecord(value.payload)) { this.hooks.onInvalid(); return; }
    const { metadata, payload } = value;
    if (typeof metadata.message_id !== 'string' || !metadata.message_id || metadata.message_id.length > 128 || typeof metadata.message_timestamp !== 'string' || !Number.isFinite(Date.parse(metadata.message_timestamp)) || Math.abs(Date.now() - Date.parse(metadata.message_timestamp)) > 10 * 60_000 || typeof metadata.message_type !== 'string') { this.hooks.onInvalid(); return; }
    const type = metadata.message_type;
    if (!['session_welcome', 'session_keepalive', 'session_reconnect', 'notification', 'revocation'].includes(type)) { this.hooks.onInvalid(); return; }
    // Twitch may send the first notification before the subscription HTTP response arrives.
    if (ctx.welcomed && !ctx.subscriptionId && ['notification', 'revocation'].includes(type)) {
      if (ctx.pending.length < 32) ctx.pending.push(value); else this.hooks.onInvalid();
      this.watch(ctx); return;
    }
    if (!this.recent.accept(metadata.message_id)) { this.hooks.onDuplicate(); return; }
    if (type === 'session_welcome') {
      const session = payload.session;
      if (ctx.welcomed || !isRecord(session) || typeof session.id !== 'string' || !session.id || session.status !== 'connected' || typeof session.keepalive_timeout_seconds !== 'number' || !Number.isInteger(session.keepalive_timeout_seconds) || session.keepalive_timeout_seconds < 10 || session.keepalive_timeout_seconds > 600) { this.hooks.onInvalid(); return; }
      ctx.welcomed = true; ctx.sessionId = session.id; ctx.timeoutSeconds = session.keepalive_timeout_seconds; this.watch(ctx);
      this.hooks.onHeartbeat();
      if (ctx.migration) {
        const previous = this.active;
        if (!previous?.subscriptionId) { this.lost(ctx); return; }
        ctx.subscriptionId = previous.subscriptionId; this.active = ctx; this.handoff = undefined;
        this.retire(previous); this.attempts = 0;
        this.hooks.onState('connected', null, 0);
      } else {
        const subscription = await this.hooks.subscribe(session.id, ctx.abort.signal);
        if (ctx.closed || this.stopped) return;
        ctx.subscriptionId = subscription; this.attempts = 0;
        this.hooks.onState('connected', null, 0);
      }
      const pending = ctx.pending.splice(0);
      for (const item of pending) { if (!ctx.closed && !this.stopped) await this.message(ctx, item); }
      return;
    }
    if (!ctx.welcomed) { this.hooks.onInvalid(); return; }
    if (type === 'session_keepalive') { this.watch(ctx); this.hooks.onHeartbeat(); return; }
    if (type === 'session_reconnect') {
      if (ctx !== this.active || this.handoff || !isRecord(payload.session) || !safeReconnectUrl(payload.session.reconnect_url)) { this.hooks.onInvalid(); return; }
      this.watch(ctx); this.hooks.onState('reconnecting', 'transport_lost', 0);
      this.open(payload.session.reconnect_url, true); return;
    }
    const subscription = payload.subscription;
    if (!isRecord(subscription) || subscription.id !== ctx.subscriptionId || subscription.type !== 'channel.chat.message' || subscription.version !== '1' || !isRecord(subscription.condition) || subscription.condition.broadcaster_user_id !== this.channelId || subscription.condition.user_id !== this.channelId) { this.hooks.onInvalid(); return; }
    if (type === 'revocation') {
      const issue: ConnectionIssue = ['authorization_revoked', 'user_removed'].includes(String(subscription.status)) ? 'authorization_revoked' : 'subscription_revoked';
      this.stop(); this.hooks.onRevoked(issue); return;
    }
    if (metadata.subscription_type !== 'channel.chat.message' || metadata.subscription_version !== '1' || subscription.status !== 'enabled' || !isRecord(subscription.transport) || subscription.transport.session_id !== ctx.sessionId) { this.hooks.onInvalid(); return; }
    this.watch(ctx); this.hooks.onHeartbeat();
    const normalized = normalizeTwitchChat(payload.event, this.channelId, metadata.message_timestamp);
    if (normalized) this.hooks.onMessage(normalized); else this.hooks.onInvalid();
  }
  private retire(ctx: SocketContext) {
    if (ctx.closed) return;
    ctx.closed = true; ctx.abort.abort(); clearTimeout(ctx.timer); this.sockets.delete(ctx);
    ctx.socket.close(1000);
    // Bound a peer that does not acknowledge the close handshake.
    const cleanup = setTimeout(() => ctx.socket.terminate(), 1000); cleanup.unref?.();
  }
  private lost(ctx: SocketContext) {
    if (ctx.closed || this.stopped) return;
    this.retire(ctx);
    if (ctx === this.handoff) { this.handoff = undefined; if (this.active) this.retire(this.active); this.active = undefined; }
    else if (this.handoff) return;
    else this.active = undefined;
    this.scheduleRetry();
  }
  private scheduleRetry() {
    if (this.stopped || this.retry) return;
    if (this.attempts >= 5) { this.hooks.onState('connection_failed', 'reconnect_exhausted', this.attempts); return; }
    const delay = Math.min(30_000, 1000 * 2 ** this.attempts++);
    this.hooks.onState('reconnecting', 'transport_lost', this.attempts);
    this.retry = setTimeout(() => { this.retry = undefined; this.open('wss://eventsub.wss.twitch.tv/ws', false); }, delay);
    this.retry.unref?.();
  }
  private fail(ctx: SocketContext, issue: ConnectionIssue) {
    if (ctx.closed || this.stopped) return;
    this.stop();
    if (['token_invalid', 'permissions_missing'].includes(issue)) this.hooks.onRevoked(issue);
    else this.hooks.onState('connection_failed', issue, this.attempts);
  }
  stop() { this.stopped = true; clearTimeout(this.retry); this.retry = undefined; for (const ctx of this.sockets) this.retire(ctx); this.active = this.handoff = undefined; }
}
