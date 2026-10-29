import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_KEYWORDS, isRecord, isTeamKeywords, type ChannelIdentity, type TeamKeywords } from '@chat-tug/contracts';
import { ServiceError } from './errors.js';
export interface OAuthTokens { accessToken: string; refreshToken: string; expiresAt: number; scopes: string[]; }
export interface SessionRecord {
  digest: string; csrf: string; expiresAt: number; commands: TeamKeywords;
  authorization?: { tokens: OAuthTokens; channel: ChannelIdentity };
  oauth?: { stateDigest: string; expiresAt: number };
}
export const SESSION_COOKIE = 'cta_session';
export const SESSION_TTL = 12 * 60 * 60_000;
export const SESSION_ROTATION_WINDOW_MS = 10_000;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export function equalSecret(a: string, b: string) { return timingSafeEqual(Buffer.from(digest(a), 'hex'), Buffer.from(digest(b), 'hex')); }
export function sessionCookie(value: string, secure: boolean) { return `${SESSION_COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}${secure ? '; Secure' : ''}`; }
export function readSessionCookie(header: string | undefined) {
  const value = header?.split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return value && /^[\w-]{43}$/.test(value) ? value : undefined;
}
export class SessionRepository {
  readonly records = new Map<string, SessionRecord>();
  private readonly rotated = new Map<string, number>();
  private writes: Promise<void> = Promise.resolve();
  readonly persistence: 'encrypted' | 'memory';
  constructor(private readonly directory: string, private readonly key?: Buffer, private readonly now = Date.now) { this.persistence = key ? 'encrypted' : 'memory'; }
  async load() {
    if (!this.key) return;
    try {
      const packed = await readFile(join(this.directory, 'sessions.enc'));
      if (packed.length < 32 || packed.length > 4_000_000 || packed.subarray(0, 4).toString() !== 'CTA2') throw new Error('invalid');
      const decipher = createDecipheriv('aes-256-gcm', this.key, packed.subarray(4, 16));
      decipher.setAAD(Buffer.from('Chat Tug Arena sessions v2'));
      decipher.setAuthTag(packed.subarray(16, 32));
      const data: unknown = JSON.parse(Buffer.concat([decipher.update(packed.subarray(32)), decipher.final()]).toString('utf8'));
      if (!Array.isArray(data) || data.length > 256) throw new Error('invalid');
      for (const v of data) {
        if (!isRecord(v) || typeof v.digest !== 'string' || !/^[a-f0-9]{64}$/.test(v.digest) || typeof v.csrf !== 'string' || !/^[\w-]{43}$/.test(v.csrf) || typeof v.expiresAt !== 'number' || !isTeamKeywords(v.commands)) throw new Error('invalid');
        if (v.authorization !== undefined) {
          const auth = v.authorization;
          if (!isRecord(auth) || !isRecord(auth.tokens) || !isRecord(auth.channel)) throw new Error('invalid');
          const { tokens, channel } = auth;
          if (!['accessToken', 'refreshToken'].every(k => typeof tokens[k] === 'string' && String(tokens[k]).length > 0 && String(tokens[k]).length < 4096) || typeof tokens.expiresAt !== 'number' || !Number.isFinite(tokens.expiresAt) || !Array.isArray(tokens.scopes) || !tokens.scopes.every(s => typeof s === 'string') || !['id', 'login', 'displayName'].every(k => typeof channel[k] === 'string' && String(channel[k]).length > 0 && String(channel[k]).length <= 128)) throw new Error('invalid');
        }
        if (v.oauth !== undefined && (!isRecord(v.oauth) || typeof v.oauth.stateDigest !== 'string' || !/^[a-f0-9]{64}$/.test(v.oauth.stateDigest) || typeof v.oauth.expiresAt !== 'number')) throw new Error('invalid');
        if (v.expiresAt > this.now()) this.records.set(v.digest, v as unknown as SessionRecord);
      }
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') return;
      throw new ServiceError('storage_unavailable', 503);
    }
  }
  get(raw: string | undefined) {
    if (!raw) return undefined;
    const record = this.records.get(digest(raw));
    return record && record.expiresAt > this.now() ? record : undefined;
  }
  create() {
    if (this.records.size >= 256) throw new ServiceError('provider_unavailable', 503);
    const raw = secret();
    const record: SessionRecord = { digest: digest(raw), csrf: secret(), expiresAt: this.now() + SESSION_TTL, commands: { ...DEFAULT_KEYWORDS } };
    this.records.set(record.digest, record); return { raw, record };
  }
  rotate(record: SessionRecord) {
    const now = this.now();
    for (const [key, until] of this.rotated) if (until <= now) this.rotated.delete(key);
    this.rotated.set(record.digest, now + SESSION_ROTATION_WINDOW_MS);
    if (this.rotated.size > 256) this.rotated.delete(this.rotated.keys().next().value!);
    this.records.delete(record.digest);
    const raw = secret(); record.digest = digest(raw); record.csrf = secret(); record.expiresAt = this.now() + SESSION_TTL;
    this.records.set(record.digest, record); return raw;
  }
  recentlyRotated(raw: string | undefined) {
    if (!raw) return false;
    const key = digest(raw), until = this.rotated.get(key);
    if (until === undefined) return false;
    if (until <= this.now()) { this.rotated.delete(key); return false; }
    return true;
  }
  async save() {
    if (!this.key) return;
    const task = this.writes.catch(() => {}).then(async () => {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key!, iv);
      cipher.setAAD(Buffer.from('Chat Tug Arena sessions v2'));
      const plaintext = JSON.stringify([...this.records.values()].filter(r => r.expiresAt > this.now() && r.authorization));
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await chmod(this.directory, 0o700);
      const temporary = join(this.directory, `sessions-${secret()}.tmp`);
      try {
        const handle = await open(temporary, 'wx', 0o600);
        try { await handle.writeFile(Buffer.concat([Buffer.from('CTA2'), iv, cipher.getAuthTag(), encrypted])); await handle.sync(); } finally { await handle.close(); }
        await rename(temporary, join(this.directory, 'sessions.enc'));
      } finally { await rm(temporary, { force: true }); }
    });
    this.writes = task;
    try { await task; } catch { throw new ServiceError('storage_unavailable', 503); }
  }
  async close() { await this.writes; }
}
