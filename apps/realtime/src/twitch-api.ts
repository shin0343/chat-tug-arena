import { TWITCH_SCOPES, isRecord, type ChannelIdentity, type EvidenceOrigin } from '@chat-tug/contracts';
import type { ServerConfig } from './config.js';
import { ServiceError } from './errors.js';
import type { OAuthTokens, SessionRecord } from './sessions.js';
export interface ValidatedToken { userId: string; login: string; expiresIn: number; scopes: string[]; }
export interface TwitchGateway {
  readonly origin: Extract<EvidenceOrigin, 'twitch' | 'test_fixture'>;
  authorizeUrl(state: string): string;
  exchange(code: string, signal?: AbortSignal): Promise<OAuthTokens>;
  refresh(refreshToken: string, signal?: AbortSignal): Promise<OAuthTokens>;
  validate(accessToken: string, signal?: AbortSignal): Promise<ValidatedToken>;
  identity(accessToken: string, userId: string, signal?: AbortSignal): Promise<ChannelIdentity>;
  subscribe(accessToken: string, channelId: string, sessionId: string, signal?: AbortSignal): Promise<string>;
  revoke(accessToken: string): Promise<void>;
}
export class TwitchApi implements TwitchGateway {
  readonly origin = 'twitch' as const;
  constructor(private readonly config: Pick<ServerConfig, 'clientId' | 'clientSecret' | 'redirectUri'>, private readonly fetcher: typeof fetch = fetch) {}
  authorizeUrl(state: string) {
    const url = new URL('https://id.twitch.tv/oauth2/authorize');
    url.search = new URLSearchParams({ response_type: 'code', client_id: this.config.clientId, redirect_uri: this.config.redirectUri, scope: TWITCH_SCOPES.join(' '), state, force_verify: 'true' }).toString();
    return url.toString();
  }
  private async request(url: string, init: RequestInit, issue: 'oauth_exchange_failed' | 'provider_unavailable' = 'provider_unavailable') {
    let response: Response;
    try { response = await this.fetcher(url, { ...init, redirect: 'error', signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) }); }
    catch { throw new ServiceError(issue); }
    if (!response.ok) {
      if (response.status >= 500) throw new ServiceError('provider_unavailable');
      if (response.status === 401) throw new ServiceError('token_invalid', 401);
      if (response.status === 403) throw new ServiceError('permissions_missing', 403);
      if (response.status === 429) throw new ServiceError('rate_limited', 429);
      throw new ServiceError(issue);
    }
    return response;
  }
  private async json(response: Response): Promise<Record<string, unknown>> {
    try { const data: unknown = await response.json(); if (isRecord(data)) return data; } catch { /* Never surface raw Twitch responses or request headers. */ }
    throw new ServiceError('provider_unavailable');
  }
  private async token(form: Record<string, string>, signal?: AbortSignal): Promise<OAuthTokens> {
    const response = await this.request('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.config.clientId, client_secret: this.config.clientSecret, ...form }), signal }, 'oauth_exchange_failed');
    const data = await this.json(response);
    if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 4096 || typeof data.refresh_token !== 'string' || !data.refresh_token || data.refresh_token.length > 4096 || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || !Array.isArray(data.scope) || !data.scope.every(s => typeof s === 'string') || String(data.token_type).toLowerCase() !== 'bearer') throw new ServiceError('oauth_exchange_failed');
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000, scopes: data.scope as string[] };
  }
  exchange(code: string, signal?: AbortSignal) { return this.token({ grant_type: 'authorization_code', code, redirect_uri: this.config.redirectUri }, signal); }
  refresh(refreshToken: string, signal?: AbortSignal) { return this.token({ grant_type: 'refresh_token', refresh_token: refreshToken }, signal); }
  async validate(accessToken: string, signal?: AbortSignal): Promise<ValidatedToken> {
    const data = await this.json(await this.request('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${accessToken}` }, signal }));
    if (data.client_id !== this.config.clientId || typeof data.user_id !== 'string' || !/^\d+$/.test(data.user_id) || typeof data.login !== 'string' || !data.login || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || !Array.isArray(data.scopes) || !data.scopes.every(s => typeof s === 'string')) throw new ServiceError('token_invalid', 401);
    if (!TWITCH_SCOPES.every(s => (data.scopes as string[]).includes(s))) throw new ServiceError('permissions_missing', 403);
    return { userId: data.user_id, login: data.login, expiresIn: data.expires_in, scopes: data.scopes as string[] };
  }
  private headers(token: string) { return { Authorization: `Bearer ${token}`, 'Client-Id': this.config.clientId, 'Content-Type': 'application/json' }; }
  async identity(accessToken: string, userId: string, signal?: AbortSignal): Promise<ChannelIdentity> {
    const body = await this.json(await this.request(`https://api.twitch.tv/helix/users?id=${encodeURIComponent(userId)}`, { headers: this.headers(accessToken), signal }));
    const user: unknown = Array.isArray(body.data) ? body.data[0] : null;
    if (!isRecord(user) || user.id !== userId || typeof user.login !== 'string' || user.login.length > 128 || typeof user.display_name !== 'string' || user.display_name.length > 128) throw new ServiceError('provider_unavailable');
    return { id: userId, login: user.login, displayName: user.display_name };
  }
  async subscribe(accessToken: string, channelId: string, sessionId: string, signal?: AbortSignal) {
    const response = await this.request('https://api.twitch.tv/helix/eventsub/subscriptions', { method: 'POST', headers: this.headers(accessToken), body: JSON.stringify({ type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: channelId, user_id: channelId }, transport: { method: 'websocket', session_id: sessionId } }), signal });
    const data = await this.json(response);
    const subscription: unknown = Array.isArray(data.data) ? data.data[0] : null;
    if (response.status !== 202 || !isRecord(subscription) || typeof subscription.id !== 'string' || !subscription.id || subscription.status !== 'enabled' || subscription.type !== 'channel.chat.message' || subscription.version !== '1' || !isRecord(subscription.condition) || subscription.condition.broadcaster_user_id !== channelId || subscription.condition.user_id !== channelId || !isRecord(subscription.transport) || subscription.transport.method !== 'websocket' || subscription.transport.session_id !== sessionId) throw new ServiceError('subscription_failed');
    return subscription.id;
  }
  async revoke(accessToken: string) {
    await this.request('https://id.twitch.tv/oauth2/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.config.clientId, token: accessToken }) });
  }
}
/** One refresh in flight per authorization; all callers retry once with the rotated token. */
export class TokenManager {
  private refreshing?: Promise<void>;
  private readonly abort = new AbortController();
  constructor(private readonly record: SessionRecord, private readonly api: TwitchGateway, private readonly persist: () => Promise<void>) {}
  async execute<T>(operation: (accessToken: string, signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const auth = this.record.authorization;
    if (!auth || this.abort.signal.aborted) throw new ServiceError('token_invalid', 401);
    const combined = signal ? AbortSignal.any([this.abort.signal, signal]) : this.abort.signal;
    try { return await operation(auth.tokens.accessToken, combined); }
    catch (error) {
      if (!(error instanceof ServiceError) || error.code !== 'token_invalid' || combined.aborted) throw error;
      if (this.record.authorization?.tokens.accessToken === auth.tokens.accessToken) await this.refresh();
      if (!this.record.authorization || combined.aborted) throw new ServiceError('token_invalid', 401);
      return operation(this.record.authorization.tokens.accessToken, combined);
    }
  }
  private async refresh() {
    if (!this.refreshing) this.refreshing = (async () => {
      const old = this.record.authorization;
      if (!old) throw new ServiceError('token_invalid', 401);
      let tokens: OAuthTokens;
      try { tokens = await this.api.refresh(old.tokens.refreshToken, this.abort.signal); }
      catch (error) { if (error instanceof ServiceError && ['rate_limited', 'provider_unavailable'].includes(error.code)) throw error; throw new ServiceError('token_invalid', 401); }
      const validated = await this.api.validate(tokens.accessToken, this.abort.signal);
      if (validated.userId !== old.channel.id || this.abort.signal.aborted || this.record.authorization !== old) throw new ServiceError('token_invalid', 401);
      this.record.authorization = { ...old, tokens: { ...tokens, scopes: validated.scopes } };
      await this.persist();
    })().finally(() => { this.refreshing = undefined; });
    await this.refreshing;
  }
  async validate() {
    const identity = await this.execute((token, signal) => this.api.validate(token, signal));
    if (identity.userId !== this.record.authorization?.channel.id) throw new ServiceError('token_invalid', 401);
    return identity;
  }
  close() { this.abort.abort(); }
}
