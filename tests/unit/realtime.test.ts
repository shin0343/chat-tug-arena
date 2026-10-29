import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { WebSocket } from "ws";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArenaServer } from "../../apps/realtime/src/server";
import { ArenaRoom, canTransition } from "../../apps/realtime/src/room";
import { SessionRepository } from "../../apps/realtime/src/sessions";
import { ServiceError } from "../../apps/realtime/src/errors";
import { isConnectionSnapshot, type SessionView } from "../../packages/contracts/src/index";
import { testConfig, gateway, FakeSocket, authorize, notification, welcome } from "../helpers/twitch";

describe("session HTTP and realtime boundary", () => {
  let app: Awaited<ReturnType<typeof createArenaServer>>; let origin: string; let cookie: string; let session: SessionView;
  const allowed = "http://127.0.0.1:3000";
  beforeEach(async () => {
    app = await createArenaServer(testConfig(false)); app.server.listen(0, "127.0.0.1"); await once(app.server, "listening");
    origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const response = await fetch(`${origin}/api/session`); cookie = response.headers.get("set-cookie")!.split(";")[0]!; session = await response.json() as SessionView;
  });
  afterEach(async () => { await app.close(); });
  function post(path: string, payload: unknown = {}, csrf = session.csrfToken, requestOrigin = allowed) {
    return fetch(`${origin}/api/${path}`, { method: "POST", headers: { Cookie: cookie, Origin: requestOrigin, "X-CSRF-Token": csrf, "Content-Type": "application/json" }, body: JSON.stringify(payload), redirect: "manual" });
  }
  it("reports process health without inventing per-user Twitch status", async () => {
    const response = await fetch(`${origin}/health`); expect(await response.json()).toMatchObject({ protocolVersion: 2, phase: "game-engine", twitchConfigured: false, acceptingRounds: true });
    expect(isConnectionSnapshot(session.snapshot)).toBe(true); expect(session.snapshot).toMatchObject({ state: "not_connected", authorized: false, issue: "credentials_missing" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await fetch(`${origin}/not-a-route`)).status).toBe(404);
  });
  it("requires cookie, origin and CSRF for controls", async () => {
    expect((await fetch(`${origin}/api/simulation/start`, { method: "POST" })).status).toBe(401);
    expect((await post("simulation/start", {}, "wrong")).status).toBe(403);
    expect((await post("simulation/start", {}, session.csrfToken, "https://evil.test")).status).toBe(403);
    expect((await post("auth/twitch/start")).status).toBe(503);
    expect((await post("simulation/start")).status).toBe(200);
  });
  it("validates commands and returns field-specific errors", async () => {
    const invalid = await post("commands", { coral: "!same", mint: "!SAME" }); expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ error: "invalid_commands", fields: { mint: expect.any(String) } });
    const valid = await post("commands", { coral: " !Tea ", mint: "!Coffee" });
    expect(await valid.json()).toMatchObject({ snapshot: { commands: { coral: "!tea", mint: "!coffee" } } });
  });
  it("delivers real SSE client updates from the local simulation and blocks live evidence", async () => {
    const abort = new AbortController(); const response = await fetch(`${origin}/api/events`, { headers: { Cookie: cookie }, signal: abort.signal });
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-transform");
    const reader = response.body!.getReader(); let text = "";
    try {
      await post("simulation/start");
      while (!text.includes('"type":"game.input"')) { const next = await reader.read(); if (next.done) throw new Error("Stream ended early"); text += new TextDecoder().decode(next.value); }
      expect(text).toContain('"source":"simulation"'); expect(text).not.toContain("accessToken");
    } finally { abort.abort(); await reader.cancel().catch(() => {}); }
    expect((await fetch(`${origin}/api/evidence`, { headers: { Cookie: cookie } })).status).toBe(409);
  });
  it("isolates sessions and rejects cross-origin streams and public WebSocket controls", async () => {
    await post("simulation/start");
    expect((await fetch(`${origin}/api/session`)).headers.get("set-cookie")).not.toContain(cookie);
    expect((await fetch(`${origin}/api/events`, { headers: { Cookie: cookie, Origin: "https://evil.test" } })).status).toBe(403);
    const socket = new WebSocket(origin.replace("http:", "ws:") + "/ws", { origin: allowed });
    const [error] = await once(socket, "error"); expect(String(error)).toContain("403");
  });
  it("always returns from an invalid OAuth callback to a clean URL", async () => {
    const response = await fetch(`${origin}/api/auth/twitch/callback?state=wrong&code=private-code`, { headers: { Cookie: cookie }, redirect: "manual" });
    expect(response.status).toBe(303); expect(response.headers.get("location")).toBe(`${allowed}/dashboard/connection`);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
describe("room pipeline and deterministic simulation", () => {
  afterEach(() => { vi.useRealTimers(); });
  function create() {
    const repository = new SessionRepository("unused"); const { record } = repository.create(); const api = gateway(); const sockets: FakeSocket[] = [];
    const room = new ArenaRoom(record, repository, testConfig(), api, () => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
    return { room, record, sockets, api };
  }
  it("requires explicit connection transitions", () => {
    expect(canTransition("not_connected", "connected")).toBe(false); expect(canTransition("connecting", "connected")).toBe(true); expect(canTransition("connected", "authorization_expired")).toBe(true);
  });
  it("clears authorization when validation and refresh can no longer restore access", async () => {
    const { room, record, api } = create(); authorize(record);
    api.validate.mockRejectedValue(new ServiceError("token_invalid", 401)); api.refresh.mockRejectedValue(new ServiceError("token_invalid", 401));
    try { await room.connect(); expect(room.snapshot()).toMatchObject({ state: "authorization_expired", authorized: false, issue: "token_invalid" }); }
    finally { room.close(); }
  });
  it("publishes normalized fixture Twitch inputs to subscribers without passing the real gate", async () => {
    vi.useFakeTimers(); const { room, record, sockets } = create(); authorize(record); const client = vi.fn(); room.subscribe(client, () => {});
    try {
      await room.connect(); sockets[0]!.receive(welcome()); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      sockets[0]!.receive(notification()); await vi.advanceTimersByTimeAsync(150);
      expect(client).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", inputs: [expect.objectContaining({ type: "game.input", source: "twitch", team: "coral" })], evidence: { origin: "test_fixture", liveMessageReceivedAt: null, eventId: null } }));
    } finally { room.close(); }
  });
  it("replays multiple users, bursts, invalid and duplicate messages, quiet periods and disconnection deterministically", async () => {
    vi.useFakeTimers(); const { room } = create();
    try {
      room.startSimulation(); await vi.advanceTimersByTimeAsync(1400); const quiet = room.snapshot(); expect(quiet.simulation?.step).toBe("quiet");
      await vi.advanceTimersByTimeAsync(800); expect(room.snapshot().counters).toEqual(quiet.counters);
      await vi.advanceTimersByTimeAsync(600); expect(room.snapshot().simulation?.step).toBe("disconnected");
      await vi.advanceTimersByTimeAsync(3200); const first = room.snapshot();
      expect(first.counters).toMatchObject({ recognized: 10, duplicates: 1, invalid: 1, ignored: 3 });
      expect(new Set(first.inputs.map(input => input.userId)).size).toBe(4); expect(first.evidence.origin).toBe("simulation");
      expect(first.simulation).toEqual({ running: false, step: "complete" });
      room.startSimulation(); await vi.advanceTimersByTimeAsync(6000); expect(room.snapshot().counters).toEqual(first.counters);
    } finally { room.close(); }
  });
  it("switches exclusively between live and simulation input and stops scheduled work", async () => {
    vi.useFakeTimers(); const { room, record, sockets } = create(); authorize(record);
    try {
      await room.connect(); room.startSimulation(); expect(sockets[0]!.closed).toBe(true);
      sockets[0]!.receive(notification()); await vi.advanceTimersByTimeAsync(500);
      expect(room.snapshot().inputs.every(input => input.source === "simulation")).toBe(true);
      room.stopSimulation(); const stopped = room.snapshot().counters; await vi.advanceTimersByTimeAsync(10_000); expect(room.snapshot().counters).toEqual(stopped);
      expect(room.snapshot().state).toBe("not_connected");
    } finally { room.close(); }
  });
});

it("runs HTTP OAuth → fixture EventSub → typed SSE without passing real Twitch evidence", async () => {
  const api = gateway(); const sockets: FakeSocket[] = [];
  const app = await createArenaServer(testConfig(), { api, socketFactory: () => { const socket = new FakeSocket(); sockets.push(socket); return socket; } });
  app.server.listen(0, "127.0.0.1"); await once(app.server, "listening");
  const origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`; const allowed = "http://127.0.0.1:3000";
  const abort = new AbortController();
  try {
    const initial = await fetch(`${origin}/api/session`); const oldCookie = initial.headers.get("set-cookie")!.split(";")[0]!; const session = await initial.json() as SessionView;
    const start = await fetch(`${origin}/api/auth/twitch/start`, { method: "POST", headers: { Origin: allowed, Cookie: oldCookie, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrf: session.csrfToken }), redirect: "manual" });
    expect(start.status).toBe(303); const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const returned = await fetch(`${origin}/api/auth/twitch/callback?${new URLSearchParams({ state, code: "fixture-code" })}`, { headers: { Cookie: oldCookie }, redirect: "manual" });
    expect(returned.status).toBe(303); expect(returned.headers.get("location")).toBe(`${allowed}/dashboard/connection`);
    const cookie = returned.headers.get("set-cookie")!.split(";")[0]!; expect(cookie).not.toBe(oldCookie);
    expect((await fetch(`${origin}/api/events`, { headers: { Cookie: oldCookie } })).status).toBe(401);
    const stream = await fetch(`${origin}/api/events`, { headers: { Cookie: cookie }, signal: abort.signal }); const reader = stream.body!.getReader();
    sockets[0]!.receive(welcome()); await new Promise(resolve => setTimeout(resolve, 0)); sockets[0]!.receive(notification());
    let output = ""; while (!output.includes('"type":"game.input"')) { const chunk = await reader.read(); if (chunk.done) throw new Error("No typed input"); output += new TextDecoder().decode(chunk.value); }
    expect(output).toContain('"origin":"test_fixture"'); expect(output).toContain('"team":"coral"'); expect(output).not.toContain("fixture-access-private");
    const next = await (await fetch(`${origin}/api/session`, { headers: { Cookie: cookie } })).json() as SessionView;
    const ack = await fetch(`${origin}/api/evidence/ack`, { method: "POST", headers: { Origin: allowed, Cookie: cookie, "X-CSRF-Token": next.csrfToken, "Content-Type": "application/json" }, body: JSON.stringify({ eventId: next.snapshot.inputs[0]!.id }) });
    expect(ack.status).toBe(409); expect((await fetch(`${origin}/api/evidence`, { headers: { Cookie: cookie } })).status).toBe(409);
  } finally { abort.abort(); await app.close(); }
});

it("closes the HTTP listener even when private storage fails during shutdown", async () => {
  const root = await mkdtemp(join(tmpdir(), "cta-shutdown-test-")); const directory = join(root, "vault"); await mkdir(directory);
  const app = await createArenaServer({ ...testConfig(false), dataDirectory: directory, encryptionKey: Buffer.alloc(32, 9) });
  app.server.listen(0, "127.0.0.1"); await once(app.server, "listening");
  try {
    await rename(directory, join(root, "moved")); await writeFile(directory, "storage unavailable");
    await expect(app.runtime.repository.save()).rejects.toMatchObject({ code: "storage_unavailable" });
    await expect(app.close()).rejects.toBeDefined();
    expect(app.server.listening).toBe(false);
  } finally {
    if (app.server.listening) await new Promise<void>(resolve => app.server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
