import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventSubConnection, safeReconnectUrl, type EventSubHooks } from "../../apps/realtime/src/eventsub";
import { FakeSocket, frame, notification, welcome } from "../helpers/twitch";
describe("EventSub lifecycle", () => {
  let sockets: FakeSocket[]; let urls: string[]; let hooks: EventSubHooks; let connection: EventSubConnection;
  beforeEach(() => {
    vi.useFakeTimers(); sockets = []; urls = [];
    hooks = { subscribe: vi.fn(async () => "subscription-1"), onState: vi.fn(), onMessage: vi.fn(), onInvalid: vi.fn(), onDuplicate: vi.fn(), onHeartbeat: vi.fn(), onRevoked: vi.fn() };
    connection = new EventSubConnection("123", hooks, url => { urls.push(url); const socket = new FakeSocket(); sockets.push(socket); return socket; });
    connection.start();
  });
  afterEach(() => { connection.stop(); vi.useRealTimers(); });
  const settle = () => Promise.resolve();
  it("stays connecting until Twitch confirms the subscription and buffers early chat", async () => {
    let resolve!: (value: string) => void;
    hooks.subscribe = vi.fn(() => new Promise<string>(r => { resolve = r; }));
    sockets[0]!.receive(welcome()); sockets[0]!.receive(notification());
    expect(hooks.onState).not.toHaveBeenCalledWith("connected", null, 0);
    resolve("subscription-1"); await settle(); await settle();
    expect(hooks.onState).toHaveBeenCalledWith("connected", null, 0);
    expect(hooks.onMessage).toHaveBeenCalledWith(expect.objectContaining({ text: "!coral", source: "twitch" }));
  });
  it("normalizes chat, rejects duplicate envelopes and invalid payloads", async () => {
    sockets[0]!.receive(welcome()); await settle();
    const message = notification(); sockets[0]!.receive(message); sockets[0]!.receive(message);
    sockets[0]!.emit("message", Buffer.from("bad json")); sockets[0]!.receive(frame("unknown", {}));
    expect(hooks.onMessage).toHaveBeenCalledTimes(1); expect(hooks.onDuplicate).toHaveBeenCalledTimes(1); expect(hooks.onInvalid).toHaveBeenCalledTimes(2);
  });
  it("migrates on Twitch reconnect without creating another subscription", async () => {
    sockets[0]!.receive(welcome()); await settle();
    sockets[0]!.receive(frame("session_reconnect", { session: { reconnect_url: "wss://eventsub.wss.twitch.tv/ws?reconnect=fixture" } }));
    expect(sockets[0]!.closed).toBe(false); expect(urls[1]).toContain("reconnect=");
    sockets[1]!.receive(welcome("session-2")); await settle();
    expect(sockets[0]!.closed).toBe(true); expect(hooks.subscribe).toHaveBeenCalledTimes(1);
    sockets[1]!.receive(notification("after-handoff", "!mint", "session-2"));
    expect(hooks.onMessage).toHaveBeenCalledWith(expect.objectContaining({ text: "!mint" }));
  });
  it("opens a new socket and re-subscribes after unexpected loss", async () => {
    sockets[0]!.receive(welcome()); await settle(); sockets[0]!.lose();
    expect(hooks.onState).toHaveBeenCalledWith("reconnecting", "transport_lost", 1);
    await vi.advanceTimersByTimeAsync(1000); sockets[1]!.receive(welcome("new-session")); await settle();
    expect(hooks.subscribe).toHaveBeenCalledTimes(2);
  });
  it("uses the keepalive watchdog and stops after five failed retries", async () => {
    await vi.advanceTimersByTimeAsync(100_000);
    expect(hooks.onState).toHaveBeenLastCalledWith("connection_failed", "reconnect_exhausted", 5);
    expect(sockets).toHaveLength(6);
  });
  it("keeps a healthy socket alive and rejects foreign-channel notifications", async () => {
    sockets[0]!.receive(welcome()); await settle();
    await vi.advanceTimersByTimeAsync(11_000); sockets[0]!.receive(frame("session_keepalive", {}));
    await vi.advanceTimersByTimeAsync(11_000); expect(sockets).toHaveLength(1);
    const message = notification(); message.payload.subscription.condition.broadcaster_user_id = "999"; sockets[0]!.receive(message);
    expect(hooks.onMessage).not.toHaveBeenCalled(); expect(hooks.onInvalid).toHaveBeenCalled();
  });
  it("terminates on revocation and never resurrects after shutdown", async () => {
    sockets[0]!.receive(welcome()); await settle();
    const message = notification(); message.payload.subscription.status = "authorization_revoked";
    sockets[0]!.receive(frame("revocation", message.payload));
    expect(hooks.onRevoked).toHaveBeenCalledWith("authorization_revoked");
    await vi.advanceTimersByTimeAsync(60_000); expect(sockets).toHaveLength(1);
    expect(sockets[0]!.terminated).toBe(true);
  });
  it("does not follow untrusted reconnect URLs", () => {
    for (const url of ["ws://eventsub.wss.twitch.tv/ws", "wss://evil.test/ws", "wss://eventsub.wss.twitch.tv.evil.test/ws", "wss://user@eventsub.wss.twitch.tv/ws", "wss://eventsub.wss.twitch.tv/private", "http://127.0.0.1"]) expect(safeReconnectUrl(url)).toBe(false);
    expect(safeReconnectUrl("wss://eventsub.wss.twitch.tv/ws?reconnect=abc")).toBe(true);
  });
});
