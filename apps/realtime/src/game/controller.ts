import { type GameInputEvent, type GameScenario, type RoundConfig, type TeamId, type TeamKeywords, type InputSource, type RoundState } from '@chat-tug/contracts';
import { GameEngine } from './engine.js';
import { GAME_TUNING } from './tuning.js';
import { ScenarioPlayback, scenarioPlan } from './scenarios.js';

/** Persistent server clock. A stall pauses explicitly instead of skipping physics or replaying a burst. */
export class GameController {
  engine = new GameEngine();
  private roundNumber = 0;
  private timer?: ReturnType<typeof setInterval>;
  private previous = 0;
  private accumulator = 0;
  private publicationMs = 0;
  private playback?: ScenarioPlayback;
  private epochMs = 0;
  private manualInputNumber = 0;
  constructor(private readonly publish: () => void, private readonly receive: (raw: unknown, timestamp: string) => void, private readonly monotonic = () => performance.now()) {}
  prepare(config: RoundConfig, source: InputSource, channelId: string) {
    this.stop(); this.epochMs = Date.now();
    this.engine = new GameEngine({ roundId: `round-${++this.roundNumber}`, config, source, channelId, epochMs: this.epochMs });
    this.engine.ready(); this.publish();
  }
  matches(roundId: unknown, state: unknown) { return roundId === this.engine.roundId && state === this.engine.state; }
  start() { if (!this.engine.start(Date.now())) return false; this.run(); this.publish(); return true; }
  pause(reason: 'manual' | 'connection_lost' | 'server_lag' = 'manual') {
    this.pump(); const changed = this.engine.pause(reason); if (changed) this.publish(); return changed;
  }
  resume() { this.pump(); const changed = this.engine.resume(Date.now()); if (changed) { this.previous = this.monotonic(); this.publish(); } return changed; }
  abandon() { this.pump(); const changed = this.engine.abandon(); if (changed) { this.stop(); this.publish(); } return changed; }
  finish() { this.pump(); const changed = this.engine.finishNow(); if (changed) { this.stop(); this.publish(); } return changed; }
  reset() { this.stop(); this.engine = new GameEngine({ roundId: `round-${++this.roundNumber}` }); this.publish(); }
  sourceLost() { this.pause('connection_lost'); }
  sourceChanged() { this.abandon(); }
  input(input: GameInputEvent) { this.pump(); return this.engine.ingest(input, Date.now()); }
  scenario(scenario: GameScenario, seed: number, config: RoundConfig, commands: TeamKeywords) {
    this.prepare(config, 'simulation', 'simulation-channel');
    this.playback = new ScenarioPlayback(scenarioPlan(scenario, seed), this.engine, { ...commands }, this.epochMs, this.receive);
    this.start();
  }
  rehearse(config: RoundConfig, commands: TeamKeywords) {
    this.prepare(config, 'simulation', 'simulation-channel');
    this.playback = new ScenarioPlayback(scenarioPlan('early_blowout', 42), this.engine, { ...commands }, this.epochMs, this.receive);
  }
  testPull(team: TeamId, count: number, viewer: string, commands: TeamKeywords) {
    this.pump();
    for (let i = 0; i < count; i++) this.receive({ broadcaster_user_id: 'simulation-channel', message_id: `manual-${++this.manualInputNumber}`, chatter_user_id: `${viewer}-${i}`, chatter_user_name: count === 1 ? viewer : `${viewer} ${i + 1}`, message: { text: commands[team] } }, new Date().toISOString());
    this.publish();
  }
  private run() {
    this.previous = this.monotonic(); this.accumulator = this.publicationMs = 0;
    this.timer = setInterval(() => this.pump(), GAME_TUNING.stepMs); this.timer.unref?.();
  }
  private pumping = false;
  pump() {
    if (!this.timer || this.pumping) return;
    this.pumping = true;
    try {
      const now = this.monotonic(); const elapsed = Math.max(0, now - this.previous); this.previous = now;
      if (elapsed > GAME_TUNING.stallAfterMs) {
        this.engine.pause('server_lag'); this.accumulator = 0; this.publish(); return;
      }
      this.accumulator += elapsed;
      while (this.accumulator >= GAME_TUNING.stepMs) {
        this.accumulator -= GAME_TUNING.stepMs;
        const before: RoundState = this.engine.state;
        this.playback?.dispatch(); this.engine.advance(GAME_TUNING.stepMs); this.publicationMs += GAME_TUNING.stepMs;
        if (before !== this.engine.state || this.publicationMs >= GAME_TUNING.publishMs) { this.publicationMs = 0; this.publish(); }
        if (this.engine.state === 'FINISHED') { this.stop(); break; }
      }
    } finally { this.pumping = false; }
  }
  private stop() { clearInterval(this.timer); this.timer = undefined; this.playback = undefined; this.accumulator = 0; }
  close() { this.engine.abandon(); this.stop(); }
}
