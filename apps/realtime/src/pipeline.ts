import { EMPTY_COUNTERS, isRecord, type GameInputEvent, type NormalizedChatMessage, type PipelineCounters, type TeamKeywords } from '@chat-tug/contracts';
export class RecentIds {
  private readonly ids = new Map<string, number>();
  constructor(private readonly ttl = 10 * 60_000, private readonly max = 10_000, private readonly now = Date.now) {}
  accept(id: string) {
    const now = this.now();
    for (const [key, expires] of this.ids) { if (expires > now) break; this.ids.delete(key); }
    if (this.ids.has(id)) return false;
    if (this.ids.size >= this.max) this.ids.delete(this.ids.keys().next().value!);
    this.ids.set(id, now + this.ttl); return true;
  }
  clear() { this.ids.clear(); }
}
export function parseTeamCommand(text: string, keywords: TeamKeywords): 'coral' | 'mint' | null {
  const command = text.trim().toLowerCase();
  if (command === keywords.coral) return 'coral';
  if (command === keywords.mint) return 'mint';
  return null;
}
export function normalizeTwitchChat(event: unknown, channelId: string, timestamp: string): NormalizedChatMessage | null {
  if (!isRecord(event) || event.broadcaster_user_id !== channelId || !isRecord(event.message)) return null;
  for (const key of ['message_id', 'chatter_user_id', 'chatter_user_name'] as const) if (typeof event[key] !== 'string' || !event[key] || event[key].length > 128) return null;
  if (event.source_broadcaster_user_id && event.source_broadcaster_user_id !== channelId) return null;
  if (typeof event.message.text !== 'string' || event.message.text.length > 2000 || !Number.isFinite(Date.parse(timestamp))) return null;
  return { id: event.message_id as string, userId: event.chatter_user_id as string, displayName: event.chatter_user_name as string, channelId, text: event.message.text, source: 'twitch', occurredAt: timestamp };
}
export class ChatInputPipeline {
  readonly counters: PipelineCounters = { ...EMPTY_COUNTERS };
  readonly inputs: GameInputEvent[] = [];
  private sequence = 0;
  private readonly recent = new RecentIds();
  constructor(public commands: TeamKeywords, private readonly onInput: (input: GameInputEvent) => void = () => {}) {}
  ingest(message: NormalizedChatMessage): GameInputEvent | null {
    this.counters.received++;
    if (!this.recent.accept(`${message.source}:${message.channelId}:${message.id}`)) { this.counters.duplicates++; return null; }
    const team = parseTeamCommand(message.text, this.commands);
    if (!team) { this.counters.ignored++; return null; }
    const input: GameInputEvent = { type: 'game.input', id: `${message.source}:${message.channelId}:${message.id}`, sequence: ++this.sequence, source: message.source, channelId: message.channelId, userId: message.userId, displayName: message.displayName, team, command: this.commands[team], occurredAt: message.occurredAt };
    this.counters.recognized++; this.inputs.unshift(input); this.inputs.length = Math.min(this.inputs.length, 40);
    this.onInput(input); return input;
  }
  invalid() { this.counters.invalid++; }
  duplicate() { this.counters.duplicates++; }
  reset() { Object.assign(this.counters, EMPTY_COUNTERS); this.inputs.length = 0; this.recent.clear(); this.sequence = 0; }
}
