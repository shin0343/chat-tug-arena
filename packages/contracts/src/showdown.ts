import type { RoundConfig } from './index.js';
import type { GameSnapshot, FinishReason } from './game.js';
import type { TeamId } from './index.js';

export const SHOWDOWN_TEMPLATES = ['character', 'loadout', 'strategy', 'challenge', 'custom'] as const;
export type ShowdownTemplate = typeof SHOWDOWN_TEMPLATES[number];
export type ConsequenceType = 'apply_choice' | 'custom' | 'announce';
export type StartCondition = 'connected' | 'chat_ready';
export interface ShowdownFields {
  template: ShowdownTemplate;
  consequenceType: ConsequenceType;
  coralAction: string;
  mintAction: string;
  startCondition: StartCondition;
}
export type ShowdownConfig = RoundConfig & ShowdownFields;
export const TEMPLATE_COPY: Record<ShowdownTemplate, { label: string; title: string; coralName: string; mintName: string; coral: string; mint: string }> = {
  character: { label: 'Next character', title: 'Which character should I use next?', coralName: 'Mage', mintName: 'Knight', coral: '!mage', mint: '!knight' },
  loadout: { label: 'Next weapon / loadout', title: 'Which loadout should I take next?', coralName: 'Bow', mintName: 'Sword', coral: '!bow', mint: '!sword' },
  strategy: { label: 'Next strategy', title: 'How should we play the next match?', coralName: 'Rush', mintName: 'Defend', coral: '!rush', mint: '!defend' },
  challenge: { label: 'Next challenge', title: 'Which challenge should I try next?', coralName: 'No healing', mintName: 'Starter gear', coral: '!noheal', mint: '!starter' },
  custom: { label: 'Custom community decision', title: 'What should we do next?', coralName: 'Explore', mintName: 'Build', coral: '!explore', mint: '!build' },
};
export const DEFAULT_SHOWDOWN: Readonly<ShowdownConfig> = Object.freeze({
  title: TEMPLATE_COPY.character.title, coralName: 'Mage', mintName: 'Knight', durationSeconds: 45, cooldownSeconds: 2,
  template: 'character', consequenceType: 'apply_choice', coralAction: '', mintAction: '', startCondition: 'connected',
});
const record = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
export function validateShowdownFields(v: Record<string, unknown>): Partial<Record<keyof ShowdownFields, string>> {
  if (!['template', 'consequenceType', 'coralAction', 'mintAction', 'startCondition'].some(key => v[key] !== undefined)) return {};
  const errors: Partial<Record<keyof ShowdownFields, string>> = {};
  if (!SHOWDOWN_TEMPLATES.includes(v.template as ShowdownTemplate)) errors.template = 'Choose a showdown template.';
  if (!['apply_choice', 'custom', 'announce'].includes(String(v.consequenceType))) errors.consequenceType = 'Choose a consequence type.';
  if (!['connected', 'chat_ready'].includes(String(v.startCondition))) errors.startCondition = 'Choose a start condition.';
  for (const key of ['coralAction', 'mintAction'] as const) {
    if (!text(v[key], 120) || (v.consequenceType === 'custom' && !(v[key] as string).trim())) errors[key] = 'Enter an action of 1–120 characters for this choice.';
  }
  return errors;
}
export function hasShowdown(config: RoundConfig): config is ShowdownConfig {
  return config.template !== undefined && Object.keys(validateShowdownFields(config as unknown as Record<string, unknown>)).length === 0;
}
export function choiceAction(config: ShowdownConfig, team: TeamId): string {
  const choice = team === 'coral' ? config.coralName : config.mintName;
  if (config.consequenceType === 'custom') return team === 'coral' ? config.coralAction : config.mintAction;
  if (config.consequenceType === 'announce') return `Tell chat: “${choice} is our choice.”`;
  return ({ character: `Play as ${choice} in the next match.`, loadout: `Equip ${choice} for the next match.`, strategy: `Use the ${choice} strategy in the next match.`, challenge: `Attempt the ${choice} challenge next.`, custom: `Choose ${choice} for the next community decision.` })[config.template];
}
export interface ShowdownOutcome {
  roundId: string; question: string; winner: TeamId | null; winningChoice: string | null;
  summary: string; action: string | null; reason: FinishReason; source: 'twitch' | 'simulation'; origin: 'twitch' | 'simulation' | 'test_fixture';
  finishedAt: string; committedAt: string | null; participants: number; effectiveContributions: number;
}
export interface ShowdownSession {
  draft: ShowdownConfig; configured: boolean; settingsRevision: number; startReady: boolean;
  current: ShowdownOutcome | null; history: ShowdownOutcome[];
}
export function outcomeFor(game: GameSnapshot, finishedAt: string): ShowdownOutcome | null {
  if (!game.result || !hasShowdown(game.config) || game.source === 'idle') return null;
  const winner = game.result.winner;
  const winningChoice = winner ? winner === 'coral' ? game.config.coralName : game.config.mintName : null;
  return { roundId: game.roundId, question: game.config.title, winner, winningChoice,
    summary: winningChoice ? `Chat chose ${winningChoice}${game.config.consequenceType === 'apply_choice' && ['character', 'loadout', 'strategy'].includes(game.config.template) ? ' for the next match' : ''}.` : game.result.reason === 'abandoned' ? 'Showdown cancelled. No choice was made.' : game.result.reason === 'no_participation' ? 'No pulls this round. No choice was made.' : 'A tied showdown. No choice was made.',
    action: winner ? choiceAction(game.config, winner) : null, reason: game.result.reason, source: game.source, origin: game.source,
    finishedAt, committedAt: null, participants: game.result.uniqueViewers,
    effectiveContributions: (game.teams.coral.effectiveContributions ?? game.teams.coral.contributions) + (game.teams.mint.effectiveContributions ?? game.teams.mint.contributions) };
}
export function isShowdownOutcome(v: unknown): v is ShowdownOutcome {
  if (!record(v) || !text(v.roundId, 128) || !text(v.question, 60) || !text(v.summary, 180) || !['endpoint', 'time', 'manual', 'tie', 'no_participation', 'abandoned'].includes(String(v.reason)) || !['twitch', 'simulation'].includes(String(v.source)) || !['twitch', 'simulation', 'test_fixture'].includes(String(v.origin))) return false;
  if (typeof v.finishedAt !== 'string' || !Number.isFinite(Date.parse(v.finishedAt)) || (v.committedAt !== null && (typeof v.committedAt !== 'string' || !Number.isFinite(Date.parse(v.committedAt))))) return false;
  if (!Number.isSafeInteger(v.participants) || Number(v.participants) < 0 || typeof v.effectiveContributions !== 'number' || !Number.isFinite(v.effectiveContributions) || v.effectiveContributions < 0) return false;
  return v.winner === null ? v.winningChoice === null && v.action === null && v.committedAt === null : ['coral', 'mint'].includes(String(v.winner)) && text(v.winningChoice, 20) && Boolean(v.winningChoice) && text(v.action, 160) && Boolean(v.action);
}
export function outcomeMatchesGame(outcome: ShowdownOutcome, game: GameSnapshot): boolean {
  if (game.state !== 'FINISHED') return false;
  const expected = outcomeFor(game, outcome.finishedAt);
  return Boolean(expected && (['roundId', 'question', 'winner', 'winningChoice', 'summary', 'action', 'reason', 'source', 'participants', 'effectiveContributions'] as const).every(key => expected[key] === outcome[key]));
}
