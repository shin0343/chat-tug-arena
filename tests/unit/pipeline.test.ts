import { describe, expect, it } from "vitest";
import { DEFAULT_KEYWORDS, isConnectionSnapshot, normalizeKeywords, validateKeywords } from "../../packages/contracts/src/index";
import { ChatInputPipeline, RecentIds, normalizeTwitchChat, parseTeamCommand } from "../../apps/realtime/src/pipeline";
import { rawChat } from "../helpers/twitch";
describe("typed chat boundary", () => {
  it("normalizes a real EventSub chat shape and strips irrelevant text/fragments", () => {
    expect(normalizeTwitchChat(rawChat(), "123", new Date(0).toISOString())).toEqual({ id: "chat-1", channelId: "123", userId: "456", displayName: "Fixture chatter", text: "!coral", source: "twitch", occurredAt: new Date(0).toISOString() });
  });
  it("rejects malformed, foreign-channel and shared-chat-source messages", () => {
    for (const raw of [null, [], {}, { ...rawChat(), message: { text: 5 } }, { ...rawChat(), chatter_user_name: "" }, { ...rawChat(), broadcaster_user_id: "999" }, { ...rawChat(), source_broadcaster_user_id: "999" }, { ...rawChat(), message: { text: "x".repeat(2001) } }]) expect(normalizeTwitchChat(raw, "123", new Date().toISOString())).toBeNull();
    expect(normalizeTwitchChat(rawChat(), "123", "invalid")).toBeNull();
  });
  it("matches complete configurable commands, with whitespace and case handling", () => {
    const keywords = normalizeKeywords({ coral: " !Tea ", mint: "!Coffee" });
    expect(parseTeamCommand("  !TEA\n", keywords)).toBe("coral");
    expect(parseTeamCommand("!coffee", keywords)).toBe("mint");
    for (const text of ["!teaish", "hello !tea", "!tea !coffee", "!tea!", "！tea", "!coral"]) expect(parseTeamCommand(text, keywords)).toBeNull();
    expect(validateKeywords({ coral: "!TEA", mint: "!tea" }).mint).toBeDefined();
    for (const value of [null, {}, { coral: "!1", mint: "!mint" }, { coral: "!a".repeat(22), mint: "!mint" }]) expect(Object.keys(validateKeywords(value)).length).toBeGreaterThan(0);
  });
  it("rejects duplicate message IDs even if the envelope changed and bounds history", () => {
    const pipeline = new ChatInputPipeline(DEFAULT_KEYWORDS);
    const message = normalizeTwitchChat(rawChat(), "123", new Date().toISOString())!;
    expect(pipeline.ingest(message)?.team).toBe("coral");
    expect(pipeline.ingest({ ...message, text: "!mint" })).toBeNull();
    pipeline.ingest({ ...message, id: "ignored", text: "hello" });
    for (let i = 0; i < 50; i++) pipeline.ingest({ ...message, id: `fresh-${i}` });
    expect(pipeline.inputs).toHaveLength(40);
    expect(pipeline.inputs[0]?.sequence).toBe(51);
    expect(pipeline.counters).toMatchObject({ recognized: 51, duplicates: 1, ignored: 1 });
  });
  it("expires duplicate IDs and enforces capacity", () => {
    let now = 0; const ids = new RecentIds(10, 2, () => now);
    expect(ids.accept("a")).toBe(true); expect(ids.accept("a")).toBe(false);
    ids.accept("b"); ids.accept("c"); expect(ids.accept("a")).toBe(true);
    now = 11; expect(ids.accept("a")).toBe(true);
  });
  it("rejects untrusted client snapshots", () => {
    for (const value of [null, {}, { protocolVersion: 1 }, { protocolVersion: 2, state: "fake_connected" }]) expect(isConnectionSnapshot(value)).toBe(false);
  });
});
