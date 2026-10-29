import { outcomeFor, type GameSnapshot, type ShowdownOutcome } from '@chat-tug/contracts';

/** Ephemeral room history, bounded at 20. Only server results create entries; clients can commit, never rewrite them. */
export class ShowdownLedger {
  private readonly entries: ShowdownOutcome[] = [];
  capture(game: GameSnapshot, now?: string, origin?: ShowdownOutcome['origin']) {
    if (!game.result || this.entries.some(entry => entry.roundId === game.roundId)) return;
    const entry = outcomeFor(game, now ?? new Date().toISOString());
    if (entry) { if (origin) entry.origin = origin; this.entries.unshift(entry); if (this.entries.length > 20) this.entries.pop(); }
  }
  get pending() { return this.entries.some(entry => entry.winner && !entry.committedAt); }
  current(roundId: string) { const entry = this.entries.find(entry => entry.roundId === roundId); return entry ? { ...entry } : null; }
  history() { return this.entries.map(entry => ({ ...entry })); }
  commit(roundId: string, now = new Date().toISOString()) {
    const entry = this.entries.find(entry => entry.roundId === roundId);
    if (!entry?.winner) return false;
    entry.committedAt ??= now;
    return true;
  }
}
