import { DEFAULT_CONFIG, DEFAULT_KEYWORDS, type GameInputEvent, type GameScenario, type TeamId, type TeamKeywords } from '@chat-tug/contracts';
import { ChatInputPipeline, normalizeTwitchChat } from '../pipeline.js';
import { GameEngine } from './engine.js';
import { GAME_TUNING } from './tuning.js';

export type ScenarioAction = { at: number; kind: 'input'; id: string; user: string; team: TeamId } | { at: number; kind: 'pause' | 'resume' };
/** Seeded scheduling is test data only. The engine never draws a random number. */
export function scenarioPlan(scenario: GameScenario, seed = 42): ScenarioAction[] {
  let state = seed >>> 0 || 1;
  const jitter = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % 5 * 20; };
  const actions: ScenarioAction[] = [];
  let number = 0;
  const pull = (at: number, team: TeamId, user: string, id = `message-${++number}`) => actions.push({ kind: 'input', at: at + GAME_TUNING.countdownMs, team, user, id });
  const crew = (at: number, team: TeamId, count: number, prefix: string = team) => { for (let i = 0; i < count; i++) pull(at, team, `${prefix}-${i}`); };
  switch (scenario) {
    case 'balanced':
      for (let at = 500; at < 44_000; at += 2400) { const time = at + jitter(); crew(time, 'coral', 3); crew(time, 'mint', 3); }
      break;
    case 'early_blowout':
      for (let at = 500; at < 20_000; at += 2200) crew(at + jitter(), 'coral', 10);
      break;
    case 'late_comeback':
      for (const at of [1000, 5500, 10_000, 14_500, 19_000, 23_500, 28_000]) crew(at, 'coral', 2);
      for (let at = 30_000; at < 44_000; at += 2200) crew(at + jitter(), 'mint', 6);
      break;
    case 'combo_rush':
      crew(500, 'coral', 3); crew(1100, 'coral', 6); crew(1700, 'coral', 10);
      for (let at = 4000; at < 20_000; at += 2200) crew(at + jitter(), 'coral', 10);
      break;
    case 'spam_attempt':
      for (let at = 500; at < 44_000; at += 40) { pull(at, 'coral', 'one-spammer'); pull(at, 'coral', 'one-spammer', 'same-replayed-message'); }
      for (let at = 12_000; at < 44_000; at += 2400) crew(at + jitter(), 'mint', 3);
      break;
    case 'connection_interruption':
      for (let at = 500; at < 44_000; at += 2400) { crew(at, 'coral', 3); crew(at, 'mint', 3); }
      actions.push({ at: 15_000, kind: 'pause' }, { at: 17_000, kind: 'resume' });
      crew(12_500, 'coral', 6, 'gap-coral');
      break;
    case 'quiet': break;
  }
  return actions.sort((a, b) => a.at - b.at);
}

/** Same dispatcher is used by the server harness and offline scenario measurements. */
export class ScenarioPlayback {
  private index = 0;
  constructor(readonly actions: readonly ScenarioAction[], private readonly engine: GameEngine, private readonly commands: TeamKeywords, private readonly epochMs: number, private readonly ingest: (input: unknown, timestamp: string) => void) {}
  dispatch() {
    while (this.index < this.actions.length && this.actions[this.index]!.at <= this.engine.simulationClockMs) {
      const action = this.actions[this.index++]!;
      if (action.kind === 'pause') this.engine.pause('connection_lost');
      else if (action.kind === 'resume') this.engine.resume();
      else if (action.kind === 'input') this.ingest({ broadcaster_user_id: 'simulation-channel', message_id: action.id, chatter_user_id: action.user, chatter_user_name: action.user, message: { text: this.commands[action.team] } }, new Date(this.epochMs + action.at).toISOString());
    }
  }
}
export function measureScenario(scenario: GameScenario, seed = 42) {
  const engine = new GameEngine({ roundId: `scenario-${scenario}-${seed}`, config: DEFAULT_CONFIG, source: 'simulation', channelId: 'simulation-channel' });
  const pipeline = new ChatInputPipeline(DEFAULT_KEYWORDS, input => engine.ingest(input));
  const playback = new ScenarioPlayback(scenarioPlan(scenario, seed), engine, DEFAULT_KEYWORDS, 0, (raw, timestamp) => {
    const message = normalizeTwitchChat(raw, 'simulation-channel', timestamp);
    if (message) pipeline.ingest({ ...message, source: 'simulation' });
  });
  engine.ready(); engine.start();
  let minimum = 0, maximum = 0, peakVelocity = 0;
  for (let step = 0; step < 6000 && engine.state !== 'FINISHED'; step++) {
    playback.dispatch(); engine.advance(GAME_TUNING.stepMs);
    const snapshot = engine.snapshot(); minimum = Math.min(minimum, snapshot.position); maximum = Math.max(maximum, snapshot.position); peakVelocity = Math.max(peakVelocity, Math.abs(snapshot.velocity));
  }
  const snapshot = engine.snapshot();
  return { scenario, seed, winner: snapshot.result?.winner ?? null, reason: snapshot.result?.reason, activeMs: snapshot.elapsedMs, wallMs: snapshot.clockMs, position: snapshot.position, minimum, maximum, peakVelocity, uniqueViewers: snapshot.uniqueViewers, accepted: snapshot.diagnostics.accepted, rejected: snapshot.diagnostics.rejected, pipelineDuplicates: pipeline.counters.duplicates, combos: snapshot.events.filter(e => e.type === 'TEAM_COMBO_STARTED').length, comebacks: snapshot.events.filter(e => e.type === 'COMEBACK_DETECTED').length, snapshot };
}

export function simulationInput(team: TeamId, user: string, id: string, atMs: number): GameInputEvent {
  return { type: 'game.input', id, sequence: 1, source: 'simulation', channelId: 'simulation-channel', userId: user, displayName: user, team, command: DEFAULT_KEYWORDS[team], occurredAt: new Date(atMs).toISOString() };
}
