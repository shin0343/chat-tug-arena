import { EventEmitter } from "node:events";
import { vi } from "vitest";
import { readConfig } from "../../apps/realtime/src/config";
import type { EventSocket } from "../../apps/realtime/src/eventsub";
import type { TwitchGateway } from "../../apps/realtime/src/twitch-api";
import type { SessionRecord } from "../../apps/realtime/src/sessions";
export const testConfig = (configured = true) => readConfig({ APP_ORIGIN: "http://127.0.0.1:3000", ...(configured ? { TWITCH_CLIENT_ID: "fixture-client", TWITCH_CLIENT_SECRET: "fixture-secret" } : {}) });
export const tokens = () => ({ accessToken: "fixture-access-private", refreshToken: "fixture-refresh-private", scopes: ["user:read:chat"], expiresAt: Date.now() + 3_600_000 });
export const channel = { id: "123", login: "fixture_broadcaster", displayName: "Fixture broadcaster" };
export function gateway() {
  return {
    origin: "test_fixture" as const,
    authorizeUrl: (state: string) => `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({ client_id: "fixture-client", state, response_type: "code", scope: "user:read:chat" })}`,
    exchange: vi.fn(async () => tokens()), refresh: vi.fn(async () => ({ ...tokens(), accessToken: "fixture-new-access" })),
    validate: vi.fn(async () => ({ userId: channel.id, login: channel.login, scopes: ["user:read:chat"], expiresIn: 3600 })),
    identity: vi.fn(async () => channel), subscribe: vi.fn(async () => "subscription-1"), revoke: vi.fn(async () => {}),
  } satisfies TwitchGateway;
}
export function authorize(record: SessionRecord) { record.authorization = { tokens: tokens(), channel }; }
let messageNumber = 0;
export function frame<P>(type: string, payload: P, extra: Record<string, unknown> = {}) {
  return { metadata: { message_id: `envelope-${++messageNumber}`, message_type: type, message_timestamp: new Date().toISOString(), ...(type === "notification" ? { subscription_type: "channel.chat.message", subscription_version: "1" } : {}), ...extra }, payload };
}
export const welcome = (id = "session-1") => frame("session_welcome", { session: { id, status: "connected", keepalive_timeout_seconds: 10 } });
export const rawChat = (id = "chat-1", text = "!coral") => ({ message_id: id, broadcaster_user_id: "123", chatter_user_id: "456", chatter_user_name: "Fixture chatter", message: { text } });
export function notification(id = "chat-1", text = "!coral", session = "session-1") {
  return frame("notification", { subscription: { id: "subscription-1", type: "channel.chat.message", version: "1", status: "enabled", condition: { broadcaster_user_id: "123", user_id: "123" }, transport: { method: "websocket", session_id: session } }, event: rawChat(id, text) });
}
export class FakeSocket extends EventEmitter implements EventSocket {
  closed = false; terminated = false;
  receive(value: unknown) { this.emit("message", Buffer.from(JSON.stringify(value)), false); }
  close() { this.closed = true; this.emit("close", 1000); }
  terminate() { this.terminated = true; }
  lose() { this.emit("close", 4005); }
}
