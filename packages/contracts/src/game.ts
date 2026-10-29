import { isRecord, type EvidenceOrigin, type InputSource } from './connection.js';
import { isRoundConfig, type RoundConfig, type TeamId } from './index.js';
import { isShowdownOutcome, outcomeMatchesGame, type ShowdownOutcome } from './showdown.js';

export const ROUND_STATES = ['IDLE', 'READY', 'COUNTDOWN', 'ACTIVE', 'PAUSED', 'FINISHED'] as const;
export type RoundState = typeof ROUND_STATES[number];
export type PauseReason = 'manual' | 'connection_lost' | 'server_lag';
export type FinishReason = 'endpoint' | 'time' | 'manual' | 'tie' | 'no_participation' | 'abandoned';
export const INPUT_REJECTIONS = ['inactive', 'duplicate', 'cooldown', 'team_locked', 'repeat_limit', 'rate_limited', 'capacity', 'late', 'wrong_source'] as const;
export type InputRejection = typeof INPUT_REJECTIONS[number];
export interface ComboState { level: number; multiplier: number; uniqueUsers: number; remainingMs: number; cooldownMs: number; }
export interface TeamPressure { force: number; intensity: number; uniqueViewers: number; contributions: number; effectiveContributions?: number; combo: ComboState; }
export interface RoundResult {
  roundId: string; winner: TeamId | null; reason: FinishReason; finalPosition: number;
  elapsedMs: number; uniqueViewers: number; contributions: Record<TeamId, number>;
}
interface EventBase { sequence: number; roundId: string; atMs: number; }
export type GameVisualEvent = EventBase & (
  | { type: 'TEAM_COMBO_STARTED' | 'TEAM_COMBO_UPGRADED'; team: TeamId; level: number; multiplier: number; durationMs: number }
  | { type: 'TEAM_COMBO_EXPIRED'; team: TeamId }
  | { type: 'MOMENTUM_SWING' | 'COMEBACK_DETECTED'; team: TeamId }
  | { type: 'TEAM_LEAD_CHANGED'; team: TeamId | null }
  | { type: 'ROUND_COUNTDOWN'; phase: 'start' | 'final'; seconds: number }
  | { type: 'ROUND_FINISHED'; result: RoundResult }
);
export interface InputReceipt { sequence: number; atMs: number; team: TeamId; viewer: string; accepted: boolean; reason: InputRejection | null; weight: number; }
export interface GameSnapshot {
  version: 1; roundId: string; state: RoundState; source: InputSource | 'idle'; config: RoundConfig;
  tick: number; stepMs: number; clockMs: number; elapsedMs: number; remainingMs: number; countdownMs: number;
  position: number; overlayPosition: number; velocity: number; momentum: number; direction: -1 | 0 | 1;
  tension: number; leader: TeamId | null; teams: Record<TeamId, TeamPressure>; uniqueViewers: number;
  pauseReason: PauseReason | null; result: RoundResult | null;
  events: GameVisualEvent[]; lastEventSequence: number; inputs: InputReceipt[];
  diagnostics: { accepted: number; rejected: number; reasons: Record<InputRejection, number>; trackedUsers: number; trackedIds: number };
}
/** Public, read-only projection. Input receipts are always removed by the server. */
export interface OverlaySnapshot {
  consequence?: ShowdownOutcome | null;
  version: 1; revision: number; connection: string; origin: EvidenceOrigin;
  commands: { coral: string; mint: string }; game: GameSnapshot;
}
export const GAME_SCENARIOS = ['balanced', 'early_blowout', 'late_comeback', 'combo_rush', 'spam_attempt', 'quiet', 'connection_interruption'] as const;
export type GameScenario = typeof GAME_SCENARIOS[number];
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const nonnegative = (v: unknown) => finite(v) && Number(v) >= 0;
const team = (v: unknown) => v === 'coral' || v === 'mint';
function result(v: unknown): boolean {
  return isRecord(v) && typeof v.roundId === 'string' && (v.winner === null || team(v.winner)) &&
    ['endpoint', 'time', 'manual', 'tie', 'no_participation', 'abandoned'].includes(String(v.reason)) && finite(v.finalPosition) && Math.abs(Number(v.finalPosition)) <= 1 &&
    nonnegative(v.elapsedMs) && nonnegative(v.uniqueViewers) && isRecord(v.contributions) && nonnegative(v.contributions.coral) && nonnegative(v.contributions.mint);
}
function visualEvent(v: unknown): boolean {
  if (!isRecord(v) || !Number.isSafeInteger(v.sequence) || Number(v.sequence) < 1 || typeof v.roundId !== 'string' || !nonnegative(v.atMs)) return false;
  switch (v.type) {
    case 'TEAM_COMBO_STARTED': case 'TEAM_COMBO_UPGRADED': return team(v.team) && [1, 2, 3].includes(Number(v.level)) && finite(v.multiplier) && Number(v.multiplier) >= 1 && Number(v.multiplier) <= 1.75 && nonnegative(v.durationMs);
    case 'TEAM_COMBO_EXPIRED': case 'MOMENTUM_SWING': case 'COMEBACK_DETECTED': return team(v.team);
    case 'TEAM_LEAD_CHANGED': return v.team === null || team(v.team);
    case 'ROUND_COUNTDOWN': return ['start', 'final'].includes(String(v.phase)) && Number.isInteger(v.seconds) && Number(v.seconds) >= 1 && Number(v.seconds) <= 5;
    case 'ROUND_FINISHED': return result(v.result);
    default: return false;
  }
}
export function isGameSnapshot(v: unknown): v is GameSnapshot {
  if (!isRecord(v) || v.version !== 1 || typeof v.roundId !== 'string' || v.roundId.length > 128 || !ROUND_STATES.includes(v.state as RoundState) || !['twitch', 'simulation', 'idle'].includes(String(v.source)) || !isRoundConfig(v.config)) return false;
  for (const key of ['tick', 'stepMs', 'clockMs', 'elapsedMs', 'remainingMs', 'countdownMs', 'uniqueViewers', 'lastEventSequence']) if (!nonnegative(v[key])) return false;
  if (!finite(v.position) || Math.abs(Number(v.position)) > 1 || !finite(v.overlayPosition) || Number(v.overlayPosition) < 0 || Number(v.overlayPosition) > 1 || !finite(v.velocity) || !finite(v.momentum) || !finite(v.tension) || Number(v.tension) < 0 || Number(v.tension) > 1 || ![-1, 0, 1].includes(Number(v.direction)) || (v.leader !== null && !team(v.leader))) return false;
  if (v.pauseReason !== null && !['manual', 'connection_lost', 'server_lag'].includes(String(v.pauseReason))) return false;
  if ((v.result !== null && !result(v.result)) || (v.state === 'FINISHED') !== (v.result !== null)) return false;
  if (!isRecord(v.teams)) return false;
  for (const id of ['coral', 'mint']) {
    const t = v.teams[id];
    if (!isRecord(t) || !nonnegative(t.force) || !nonnegative(t.intensity) || Number(t.intensity) > 1 || !nonnegative(t.uniqueViewers) || !nonnegative(t.contributions) || !isRecord(t.combo)) return false;
    if (t.effectiveContributions !== undefined && !nonnegative(t.effectiveContributions)) return false;
    if (![0, 1, 2, 3].includes(Number(t.combo.level)) || !finite(t.combo.multiplier) || Number(t.combo.multiplier) < 1 || Number(t.combo.multiplier) > 1.75 || !nonnegative(t.combo.uniqueUsers) || !nonnegative(t.combo.remainingMs) || !nonnegative(t.combo.cooldownMs)) return false;
  }
  if (!Array.isArray(v.events) || v.events.length > 64 || !v.events.every(visualEvent) || !Array.isArray(v.inputs) || v.inputs.length > 40) return false;
  if (!v.inputs.every(i => isRecord(i) && nonnegative(i.sequence) && nonnegative(i.atMs) && team(i.team) && typeof i.viewer === 'string' && i.viewer.length <= 128 && typeof i.accepted === 'boolean' && (i.reason === null || INPUT_REJECTIONS.includes(i.reason as InputRejection)) && nonnegative(i.weight))) return false;
  const d = v.diagnostics;
  return isRecord(d) && ['accepted', 'rejected', 'trackedUsers', 'trackedIds'].every(k => nonnegative(d[k])) && isRecord(d.reasons) && INPUT_REJECTIONS.every(k => nonnegative((d.reasons as Record<string, unknown>)[k]));
}
export function isOverlaySnapshot(v: unknown): v is OverlaySnapshot {
  if (!(isRecord(v) && v.version === 1 && Number.isSafeInteger(v.revision) && Number(v.revision) >= 0 && typeof v.connection === 'string' &&
    ['none', 'simulation', 'twitch', 'test_fixture'].includes(String(v.origin)) && isRecord(v.commands) && typeof v.commands.coral === 'string' && typeof v.commands.mint === 'string' && isGameSnapshot(v.game) && v.game.inputs.length === 0)) return false;
  return v.consequence === undefined || v.consequence === null || (isShowdownOutcome(v.consequence) && outcomeMatchesGame(v.consequence, v.game));
}

/** Presentation only: interpolate two ordered snapshots, never extrapolate or decide a result. */
export function interpolatePosition(previous: GameSnapshot, current: GameSnapshot, fraction: number): number {
  if (previous.roundId !== current.roundId || previous.state !== 'ACTIVE' || current.state !== 'ACTIVE' || current.tick < previous.tick) return current.position;
  const alpha = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 1;
  return previous.position + (current.position - previous.position) * alpha;
}
