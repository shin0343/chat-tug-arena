import { interpolatePosition, type GameSnapshot, type GameVisualEvent, type TeamId } from '@chat-tug/contracts';

export type CrewAnimation = 'idle' | 'preparing' | 'pulling' | 'strong_pulling' | 'losing_balance' | 'combo' | 'victory' | 'defeat';
export interface SceneCue { type: 'lead' | 'swing' | 'comeback'; team: TeamId; until: number; }
export const SCENE = Object.freeze({ width: 1600, height: 270, travel: 150, ground: 222, maxCrew: 5, interpolationMs: 100, celebrationMs: 1400 });
export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export function crewCount(unique: number) { return unique >= 10 ? 5 : unique >= 6 ? 4 : unique >= 3 ? 3 : 2; }
export function crewAnimation(game: GameSnapshot, team: TeamId): CrewAnimation {
  if (game.state === 'FINISHED') return game.result?.winner ? game.result.winner === team ? 'victory' : 'defeat' : 'idle';
  if (game.state === 'COUNTDOWN' || (game.state === 'PAUSED' && game.countdownMs > 0)) return 'preparing';
  if (game.state !== 'ACTIVE' && game.state !== 'PAUSED') return 'idle';
  const pressure = game.teams[team];
  if (pressure.combo.level) return 'combo';
  const sign = team === 'coral' ? 1 : -1;
  if ((game.position * sign > 0.52 || game.velocity * sign > 0.18) && pressure.force > 0.02) return 'losing_balance';
  if (pressure.force > 4) return 'strong_pulling';
  return pressure.force > 0.02 ? 'pulling' : 'idle';
}

/** Bounded presentation memory. No API, user IDs, force mutation, result inference or historical effect replay. */
export class SceneTimeline {
  private previous: GameSnapshot | null = null;
  private current: GameSnapshot | null = null;
  private receivedAt = 0;
  private lastSequence = 0;
  private finishedAt = -Infinity;
  private cue: SceneCue | null = null;
  private comboAt = { coral: -Infinity, mint: -Infinity };
  recover(game: GameSnapshot, now: number) {
    this.previous = game; this.current = game; this.receivedAt = now; this.lastSequence = game.lastEventSequence;
    this.finishedAt = now - SCENE.celebrationMs; this.cue = null; this.comboAt = { coral: -Infinity, mint: -Infinity };
  }
  accept(game: GameSnapshot, now: number) {
    if (game === this.current) return;
    const before = this.current;
    const newRound = !before || before.roundId !== game.roundId;
    if (!newRound && before.tick > game.tick) return;
    this.previous = newRound ? game : before;
    this.current = game; this.receivedAt = now;
    if (newRound) {
      // Joining a finished room shows its settled result, not a replay of its celebration.
      this.recover(game, now);
      return;
    }
    if (game.state === 'FINISHED' && before?.state !== 'FINISHED') { this.finishedAt = now; this.cue = null; }
    for (const event of game.events) {
      if (event.roundId !== game.roundId || event.sequence <= this.lastSequence) continue;
      if (game.elapsedMs - event.atMs <= 1000 && game.state !== 'FINISHED') this.event(event, now);
      this.lastSequence = Math.max(this.lastSequence, event.sequence);
    }
    this.lastSequence = Math.max(this.lastSequence, game.lastEventSequence);
  }
  private event(event: GameVisualEvent, now: number) {
    if (event.type === 'TEAM_COMBO_STARTED' || event.type === 'TEAM_COMBO_UPGRADED') this.comboAt[event.team] = now;
    if (event.type === 'TEAM_COMBO_EXPIRED') this.comboAt[event.team] = -Infinity;
    const type = event.type === 'COMEBACK_DETECTED' ? 'comeback' : event.type === 'MOMENTUM_SWING' ? 'swing' : event.type === 'TEAM_LEAD_CHANGED' && event.team ? 'lead' : null;
    if (!type || !('team' in event) || !event.team) return;
    const rank = { lead: 1, swing: 2, comeback: 3 };
    if (this.cue && this.cue.until > now && rank[this.cue.type] > rank[type]) return;
    this.cue = { type, team: event.team, until: now + (type === 'comeback' ? 1600 : 1000) };
  }
  frame(now: number, running: boolean, reduced: boolean) {
    const game = this.current;
    if (!game) return null;
    const active = game.state === 'ACTIVE';
    const delta = running && (active || game.state === 'COUNTDOWN') && !reduced ? clamp(now - this.receivedAt, 0, SCENE.interpolationMs) : 0;
    const position = !reduced && running && this.previous ? interpolatePosition(this.previous, game, (now - this.receivedAt) / SCENE.interpolationMs) : game.position;
    const finishAge = reduced ? SCENE.celebrationMs : Math.max(0, now - this.finishedAt);
    const phaseMs = game.countdownMs > 0 ? 3000 - game.countdownMs + delta : game.elapsedMs + delta;
    const cue = running && this.cue && this.cue.until > now ? this.cue : null;
    return { position, phaseMs, finishAge, resultReady: game.state === 'FINISHED' && finishAge >= SCENE.celebrationMs,
      coral: crewAnimation(game, 'coral'), mint: crewAnimation(game, 'mint'), cue,
      coralPulse: running && !reduced ? clamp(1 - (now - this.comboAt.coral) / 850) : 0,
      mintPulse: running && !reduced ? clamp(1 - (now - this.comboAt.mint) / 850) : 0,
      motion: running && !reduced && ((active && (game.teams.coral.force > 0.02 || game.teams.mint.force > 0.02 || Math.abs(game.velocity) > 0.001 || game.remainingMs <= 5000)) || game.state === 'COUNTDOWN' || (game.state === 'FINISHED' && finishAge < SCENE.celebrationMs)),
      lastSequence: this.lastSequence };
  }
}

export function resultCopy(game: GameSnapshot) {
  const r = game.result;
  if (!r) return { title: '', detail: '' };
  if (r.reason === 'abandoned') return { title: 'Round abandoned', detail: 'The yard will be ready when you are.' };
  if (r.reason === 'no_participation') return { title: 'The yard is waiting', detail: 'No pulls this round. Bring your crew next time.' };
  if (!r.winner) return { title: 'A perfect balance', detail: 'A tied round. Both crews held their ground.' };
  if (r.reason === 'manual') return { title: `${r.winner === 'coral' ? game.config.coralName : game.config.mintName} win!`, detail: 'Round finished at the current position. The other crew takes a seat.' };
  return { title: `${r.winner === 'coral' ? game.config.coralName : game.config.mintName} win!`, detail: r.reason === 'endpoint' ? 'Finish line reached. The other crew takes a seat.' : 'Ahead at the final whistle. The other crew takes a seat.' };
}
