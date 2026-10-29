import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TwitchApi, TokenManager } from "../../apps/realtime/src/twitch-api";
import { ArenaRuntime } from "../../apps/realtime/src/runtime";
import { ServiceError } from "../../apps/realtime/src/errors";
import { SessionRepository, sessionCookie } from "../../apps/realtime/src/sessions";
import { readConfig } from "../../apps/realtime/src/config";
import { authorize, channel, gateway, testConfig, tokens, FakeSocket } from "../helpers/twitch";
describe("Twitch auth HTTP boundary", () => {
  it("uses authorization code, exact redirect, state and only chat read scope", () => {
    const url = new URL(new TwitchApi(testConfig()).authorizeUrl("random-state"));
    expect(url.origin).toBe("https://id.twitch.tv");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ response_type: "code", state: "random-state", scope: "user:read:chat", redirect_uri: "http://127.0.0.1:3000/api/auth/twitch/callback" });
    expect(url.toString()).not.toContain("fixture-secret");
  });
  it("sends the code and secret in a form POST, never in a URL", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ access_token: "private-access", refresh_token: "private-refresh", expires_in: 3600, scope: ["user:read:chat"], token_type: "bearer" }));
    const api = new TwitchApi(testConfig(), fetcher); await api.exchange("code-with+&chars");
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://id.twitch.tv/oauth2/token"); expect(init?.method).toBe("POST");
    const form = init?.body as URLSearchParams;
    expect(form.get("code")).toBe("code-with+&chars"); expect(form.get("client_secret")).toBe("fixture-secret"); expect(init?.redirect).toBe("error");
  });
  it("checks token audience, user identity and required scopes", async () => {
    const valid = { client_id: "fixture-client", user_id: "123", login: "owner", expires_in: 3600, scopes: ["user:read:chat"] };
    for (const bad of [{ ...valid, client_id: "other" }, { ...valid, user_id: "" }, { ...valid, expires_in: 0 }, { ...valid, scopes: [] }]) {
      const api = new TwitchApi(testConfig(), vi.fn(async () => Response.json(bad)));
      await expect(api.validate("private-access")).rejects.toBeInstanceOf(ServiceError);
    }
  });
  it("exposes fixed error codes without raw provider responses or credentials", async () => {
    for (const [status, code] of [[400, "oauth_exchange_failed"], [401, "token_invalid"], [429, "rate_limited"], [500, "provider_unavailable"]] as const) {
      const api = new TwitchApi(testConfig(), vi.fn(async () => new Response("private-secret-in-provider-error", { status })));
      await expect(api.exchange("private-code")).rejects.toMatchObject({ code });
    }
  });
  it("requires a confirmed matching WebSocket subscription", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [{ id: "sub", status: "enabled", type: "channel.chat.message", version: "1", condition: { broadcaster_user_id: "123", user_id: "123" }, transport: { method: "websocket", session_id: "session" } }] }, { status: 202 }));
    expect(await new TwitchApi(testConfig(), fetcher).subscribe("private", "123", "session")).toBe("sub");
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toMatchObject({ type: "channel.chat.message", version: "1", condition: { broadcaster_user_id: "123", user_id: "123" }, transport: { method: "websocket", session_id: "session" } });
    await expect(new TwitchApi(testConfig(), vi.fn(async () => Response.json({ data: [] }))).subscribe("private", "123", "session")).rejects.toMatchObject({ code: "subscription_failed" });
  });
  it("enforces secure origins, redirect matching, encryption and cookie flags", () => {
    for (const env of [{ APP_ORIGIN: "http://public.example" }, { TWITCH_REDIRECT_URI: "http://evil.test/callback" }, { SESSION_ENCRYPTION_KEY: "short" }, { NODE_ENV: "production", TWITCH_CLIENT_ID: "id", TWITCH_CLIENT_SECRET: "secret" }]) expect(() => readConfig(env)).toThrow();
    expect(sessionCookie("opaque", true)).toContain("HttpOnly; SameSite=Lax"); expect(sessionCookie("opaque", true)).toContain("; Secure"); expect(sessionCookie("opaque", true)).toContain("Path=/api");
  });
});
describe("OAuth session lifecycle", () => {
  const runtimes: ArenaRuntime[] = [];
  afterEach(async () => { await Promise.all(runtimes.splice(0).map(runtime => runtime.close())); });
  function create(configured = true) { const api = gateway(); const runtime = new ArenaRuntime(testConfig(configured), { api, socketFactory: () => new FakeSocket() }); runtimes.push(runtime); return { api, runtime, ...runtime.repository.create() }; }
  it("fails honestly without server credentials", async () => {
    const { runtime, record } = create(false);
    await expect(runtime.authorize(record)).rejects.toMatchObject({ code: "credentials_missing" });
    expect(runtime.room(record).snapshot()).toMatchObject({ state: "not_connected", authorized: false });
  });
  it("rejects state mismatch, expired state, denial and replay", async () => {
    const { runtime, record, api } = create();
    const url = new URL(await runtime.authorize(record)); const state = url.searchParams.get("state")!;
    await runtime.callback(record, new URLSearchParams({ state: "wrong", code: "code" })); expect(api.exchange).not.toHaveBeenCalled();
    await runtime.callback(record, new URLSearchParams({ state, error: "access_denied", error_description: "untrusted" }));
    expect(runtime.room(record).snapshot()).toMatchObject({ state: "connection_failed", issue: "oauth_denied" });
    await runtime.callback(record, new URLSearchParams({ state, code: "replay" })); expect(api.exchange).not.toHaveBeenCalled();
    const next = new URL(await runtime.authorize(record)).searchParams.get("state")!; record.oauth!.expiresAt = 0;
    await runtime.callback(record, new URLSearchParams({ state: next, code: "code" })); expect(api.exchange).not.toHaveBeenCalled();
  });
  it("validates and identifies the broadcaster, rotates session and never marks connected early", async () => {
    const { runtime, record, raw, api } = create(); const oldCsrf = record.csrf;
    const state = new URL(await runtime.authorize(record)).searchParams.get("state")!;
    const rotated = await runtime.callback(record, new URLSearchParams({ state, code: "fixture-code" }));
    expect(rotated).toBeDefined(); expect(runtime.repository.get(raw)).toBeUndefined(); expect(record.csrf).not.toBe(oldCsrf);
    expect(api.validate).toHaveBeenCalled(); expect(record.authorization?.channel).toEqual(channel);
    expect(runtime.room(record).snapshot()).toMatchObject({ state: "connecting", authorized: true, evidence: { origin: "test_fixture", liveMessageReceivedAt: null } });
    expect(JSON.stringify(runtime.room(record).snapshot())).not.toContain("fixture-access-private");
  });
  it("rejects a mismatched broadcaster identity and exchange failures", async () => {
    const { runtime, record, api } = create(); api.identity.mockResolvedValue({ ...channel, id: "999" });
    let state = new URL(await runtime.authorize(record)).searchParams.get("state")!;
    await runtime.callback(record, new URLSearchParams({ state, code: "code" })); expect(record.authorization).toBeUndefined();
    api.exchange.mockRejectedValue(new ServiceError("oauth_exchange_failed"));
    state = new URL(await runtime.authorize(record)).searchParams.get("state")!;
    await runtime.callback(record, new URLSearchParams({ state, code: "new-code" }));
    expect(runtime.room(record).snapshot().issue).toBe("oauth_exchange_failed");
  });
  it("disconnects, invalidates the old cookie and revokes server credentials", async () => {
    const { runtime, record, raw, api } = create(); authorize(record);
    const rotated = await runtime.disconnect(record);
    expect(runtime.repository.get(raw)).toBeUndefined(); expect(runtime.repository.get(rotated)?.authorization).toBeUndefined();
    expect(api.revoke).toHaveBeenCalledWith("fixture-access-private"); expect(runtime.room(record).snapshot().state).toBe("not_connected");
  });
  it("rolls back session rotation and discards new credentials when encrypted persistence fails", async () => {
    const { runtime, record, raw, api } = create(); const csrf = record.csrf;
    const state = new URL(await runtime.authorize(record)).searchParams.get("state")!;
    vi.spyOn(runtime.repository, "save").mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ServiceError("storage_unavailable"));
    expect(await runtime.callback(record, new URLSearchParams({ state, code: "code" }))).toBeUndefined();
    expect(runtime.repository.get(raw)).toBe(record); expect(record.csrf).toBe(csrf); expect(record.authorization).toBeUndefined();
    expect(api.revoke).toHaveBeenCalled(); expect(runtime.room(record).snapshot().issue).toBe("storage_unavailable");
  });
});
describe("token refresh and encrypted persistence", () => {
  it("refreshes once for concurrent 401s, validates subject and persists rotated tokens", async () => {
    const repository = new SessionRepository("unused"); const { record } = repository.create(); authorize(record);
    const api = gateway(); const persist = vi.fn(async () => {}); const manager = new TokenManager(record, api, persist);
    const operation = async (token: string) => { if (token === "fixture-access-private") throw new ServiceError("token_invalid", 401); return token; };
    expect(await Promise.all([manager.execute(operation), manager.execute(operation)])).toEqual(["fixture-new-access", "fixture-new-access"]);
    expect(api.refresh).toHaveBeenCalledTimes(1); expect(persist).toHaveBeenCalledTimes(1); manager.close();
  });
  it("does not refresh an unavailable provider, or accept a refreshed token for another user", async () => {
    const { record } = new SessionRepository("unused").create(); authorize(record); const api = gateway(); const manager = new TokenManager(record, api, async () => {});
    await expect(manager.execute(async () => { throw new ServiceError("provider_unavailable"); })).rejects.toMatchObject({ code: "provider_unavailable" }); expect(api.refresh).not.toHaveBeenCalled();
    api.validate.mockResolvedValue({ userId: "999", login: "other", scopes: ["user:read:chat"], expiresIn: 3600 });
    await expect(manager.execute(async () => { throw new ServiceError("token_invalid", 401); })).rejects.toMatchObject({ code: "token_invalid" });
    expect(record.authorization?.tokens.accessToken).toBe("fixture-access-private"); manager.close();
  });
  it("encrypts authenticated sessions with private permissions and rejects a wrong key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cta-session-test-"));
    try {
      const key = Buffer.alloc(32, 7); const repository = new SessionRepository(directory, key); const { raw, record } = repository.create(); authorize(record); await repository.save();
      const contents = await readFile(join(directory, "sessions.enc"));
      for (const value of [raw, tokens().accessToken, tokens().refreshToken, channel.login]) expect(contents.includes(Buffer.from(value))).toBe(false);
      expect((await stat(join(directory, "sessions.enc"))).mode & 0o777).toBe(0o600);
      const restored = new SessionRepository(directory, key); await restored.load(); expect(restored.get(raw)?.authorization?.channel.id).toBe("123");
      await expect(new SessionRepository(directory, Buffer.alloc(32, 8)).load()).rejects.toMatchObject({ code: "storage_unavailable" });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
