import { isGameSnapshot, type GameSnapshot } from './game.js';
import { hasShowdown, isShowdownOutcome, outcomeMatchesGame, type ShowdownSession } from './showdown.js';
import { isRoundConfig } from './index.js';
export const CONNECTION_STATES = [
  'not_connected', 'connecting', 'authorization_required', 'connected',
  'reconnecting', 'authorization_expired', 'connection_failed', 'simulation',
] as const;
export type ConnectionState = typeof CONNECTION_STATES[number];
export type InputSource = 'twitch' | 'simulation';
export type EvidenceOrigin = 'twitch' | 'simulation' | 'test_fixture' | 'none';
export const TWITCH_SCOPES = ['user:read:chat'] as const;
export interface TeamKeywords { coral: string; mint: string; }
export const DEFAULT_KEYWORDS: Readonly<TeamKeywords> = Object.freeze({ coral: '!coral', mint: '!mint' });
export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
export function validateKeywords(value: unknown): Partial<Record<keyof TeamKeywords, string>> {
  if (!isRecord(value)) return { coral: 'Enter both team commands.' };
  const errors: Partial<Record<keyof TeamKeywords, string>> = {};
  for (const team of ['coral', 'mint'] as const) {
    if (typeof value[team] !== 'string' || !/^![a-z][a-z0-9_-]{0,19}$/i.test(value[team].trim()))
      errors[team] = 'Use ! followed by 1–20 letters, numbers, underscores or hyphens. Start with a letter.';
  }
  if (typeof value.coral === 'string' && typeof value.mint === 'string' && value.coral.trim().toLowerCase() === value.mint.trim().toLowerCase()) errors.mint = 'Give each team a different command.';
  return errors;
}
export function isTeamKeywords(value: unknown): value is TeamKeywords { return Object.keys(validateKeywords(value)).length === 0; }
export function normalizeKeywords(value: TeamKeywords): TeamKeywords { return { coral: value.coral.trim().toLowerCase(), mint: value.mint.trim().toLowerCase() }; }
export interface ChannelIdentity { id: string; login: string; displayName: string; }
export interface NormalizedChatMessage {
  id: string; channelId: string; userId: string; displayName: string; text: string;
  source: InputSource; occurredAt: string;
}
/** A recognized input, not an applied game pull. Phase 3 owns simulation/game rules. */
export interface GameInputEvent {
  type: 'game.input'; id: string; sequence: number; source: InputSource;
  channelId: string; userId: string; displayName: string;
  team: 'coral' | 'mint'; command: string; occurredAt: string;
}
export const ISSUE_CODES = [
  'credentials_missing', 'authorization_pending', 'oauth_denied', 'oauth_state_invalid',
  'oauth_exchange_failed', 'token_invalid', 'permissions_missing', 'provider_unavailable',
  'rate_limited', 'subscription_failed', 'transport_lost', 'reconnect_exhausted',
  'authorization_revoked', 'subscription_revoked', 'storage_unavailable',
  'manual_disconnect', 'simulation_stopped', 'server_shutdown', 'revocation_unconfirmed',
] as const;
export type ConnectionIssue = typeof ISSUE_CODES[number];
export interface PipelineCounters { received: number; recognized: number; ignored: number; duplicates: number; invalid: number; }
export interface SimulationProgress { running: boolean; step: 'starting' | 'burst' | 'quiet' | 'disconnected' | 'reconnected' | 'complete'; }
export interface ConnectionSnapshot {
  showdown?: ShowdownSession;
  /** Added in Phase 3. Optional only for old v2 connection fixtures. */
  game?: GameSnapshot;
  protocolVersion: 2; revision: number; state: ConnectionState;
  mode: InputSource | 'idle'; channel: ChannelIdentity | null;
  credentialsConfigured: boolean; authorized: boolean; persistence: 'encrypted' | 'memory';
  issue: ConnectionIssue | null; notice: ConnectionIssue | null;
  commands: TeamKeywords; inputs: GameInputEvent[]; counters: PipelineCounters;
  lastEventAt: string | null; lastHeartbeatAt: string | null; reconnectAttempt: number;
  simulation: SimulationProgress | null;
  evidence: { origin: EvidenceOrigin; liveMessageReceivedAt: string | null; eventId: string | null };
}
export interface SessionView { csrfToken: string; snapshot: ConnectionSnapshot; }
export interface SnapshotMessage { type: 'connection.snapshot'; snapshot: ConnectionSnapshot; }
export const EMPTY_COUNTERS: Readonly<PipelineCounters> = Object.freeze({ received: 0, recognized: 0, ignored: 0, duplicates: 0, invalid: 0 });
const boundedString = (v: unknown, max = 200) => typeof v === 'string' && v.length <= max;
export function isConnectionSnapshot(value: unknown): value is ConnectionSnapshot {
  if (isRecord(value) && value.showdown !== undefined) {
    const s = value.showdown;
    if (!isRecord(s) || !isRoundConfig(s.draft) || !hasShowdown(s.draft) || typeof s.configured !== 'boolean' || !Number.isSafeInteger(s.settingsRevision) || Number(s.settingsRevision) < 0 || typeof s.startReady !== 'boolean' || !Array.isArray(s.history) || s.history.length > 20 || !s.history.every(isShowdownOutcome) || (s.current !== null && (!isShowdownOutcome(s.current) || !isGameSnapshot(value.game) || !outcomeMatchesGame(s.current, value.game)))) return false;
  }
  if (isRecord(value) && value.game !== undefined && !isGameSnapshot(value.game)) return false;
  if (!isRecord(value) || value.protocolVersion !== 2 || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !CONNECTION_STATES.includes(value.state as ConnectionState)) return false;
  if (!['twitch', 'simulation', 'idle'].includes(String(value.mode)) || typeof value.credentialsConfigured !== 'boolean' || typeof value.authorized !== 'boolean' || !['encrypted', 'memory'].includes(String(value.persistence))) return false;
  if (!isTeamKeywords(value.commands) || !Array.isArray(value.inputs) || value.inputs.length > 40 || !isRecord(value.counters) || !isRecord(value.evidence)) return false;
  if (value.channel !== null && (!isRecord(value.channel) || !boundedString(value.channel.id) || !boundedString(value.channel.login) || !boundedString(value.channel.displayName))) return false;
  for (const key of ['issue', 'notice'] as const) if (value[key] !== null && !ISSUE_CODES.includes(value[key] as ConnectionIssue)) return false;
  for (const key of Object.keys(EMPTY_COUNTERS)) if (!Number.isSafeInteger(value.counters[key]) || Number(value.counters[key]) < 0) return false;
  if (!['twitch', 'simulation', 'test_fixture', 'none'].includes(String(value.evidence.origin))) return false;
  if (value.evidence.liveMessageReceivedAt !== null && (!boundedString(value.evidence.liveMessageReceivedAt, 64) || !Number.isFinite(Date.parse(String(value.evidence.liveMessageReceivedAt))))) return false;
  if (value.evidence.eventId !== null && !boundedString(value.evidence.eventId, 512)) return false;
  for (const key of ['lastEventAt', 'lastHeartbeatAt'] as const) if (value[key] !== null && (!boundedString(value[key], 64) || !Number.isFinite(Date.parse(String(value[key]))))) return false;
  if (!Number.isSafeInteger(value.reconnectAttempt) || Number(value.reconnectAttempt) < 0) return false;
  if (value.simulation !== null && (!isRecord(value.simulation) || typeof value.simulation.running !== 'boolean' || !['starting', 'burst', 'quiet', 'disconnected', 'reconnected', 'complete'].includes(String(value.simulation.step)))) return false;
  if (value.state === 'connected' && (value.mode !== 'twitch' || !value.authorized || !value.credentialsConfigured || !value.channel || !['twitch', 'test_fixture'].includes(String(value.evidence.origin)))) return false;
  if (value.state === 'simulation' && (value.mode !== 'simulation' || !value.simulation || !['simulation', 'test_fixture'].includes(String(value.evidence.origin)))) return false;
  return value.inputs.every(input => isRecord(input) && input.type === 'game.input' && ['twitch', 'simulation'].includes(String(input.source)) && ['coral', 'mint'].includes(String(input.team)) && Number.isSafeInteger(input.sequence) && Number(input.sequence) > 0 && Number.isFinite(Date.parse(String(input.occurredAt))) && ['id', 'channelId', 'userId', 'displayName', 'command', 'occurredAt'].every(key => boundedString(input[key], key === 'id' ? 512 : 200) && String(input[key]).length > 0));
}
