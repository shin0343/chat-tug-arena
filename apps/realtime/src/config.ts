import { resolve } from 'node:path';
export interface ServerConfig {
  appOrigin: string; host: string; port: number; clientId: string; clientSecret: string;
  redirectUri: string; encryptionKey?: Buffer; dataDirectory: string; secureCookie: boolean;
}
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const app = new URL(env.APP_ORIGIN ?? 'http://127.0.0.1:3000');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname);
  if (app.username || app.password || app.pathname !== '/' || app.search || app.hash || (app.protocol !== 'https:' && !(app.protocol === 'http:' && loopback))) throw new Error('APP_ORIGIN must be an HTTPS origin, or an HTTP loopback origin for local development.');
  const port = Number(env.REALTIME_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('REALTIME_PORT must be a valid port.');
  const clientId = env.TWITCH_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.TWITCH_CLIENT_SECRET?.trim() ?? '';
  const redirectUri = env.TWITCH_REDIRECT_URI?.trim() || `${app.origin}/api/auth/twitch/callback`;
  if (new URL(redirectUri).origin !== app.origin || new URL(redirectUri).pathname !== '/api/auth/twitch/callback' || new URL(redirectUri).search || new URL(redirectUri).hash) throw new Error('TWITCH_REDIRECT_URI must match APP_ORIGIN plus /api/auth/twitch/callback exactly.');
  const key = env.SESSION_ENCRYPTION_KEY?.trim();
  if (key && !/^[a-f0-9]{64}$/i.test(key)) throw new Error('SESSION_ENCRYPTION_KEY must be 64 hexadecimal characters.');
  if (clientId && clientSecret && env.NODE_ENV === 'production' && !key) throw new Error('Configured Twitch production sessions require SESSION_ENCRYPTION_KEY.');
  return { appOrigin: app.origin, host: env.REALTIME_HOST ?? '127.0.0.1', port, clientId, clientSecret, redirectUri, ...(key ? { encryptionKey: Buffer.from(key, 'hex') } : {}), dataDirectory: resolve(env.DATA_DIRECTORY ?? '.data'), secureCookie: app.protocol === 'https:' };
}
