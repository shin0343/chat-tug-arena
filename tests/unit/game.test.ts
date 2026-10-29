import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, GAME_SCENARIOS, isGameSnapshot, interpolatePosition, type TeamId } from '../../packages/contracts/src/index';
import { GameEngine, type EngineOptions } from '../../apps/realtime/src/game/engine';
import { GAME_TUNING } from '../../apps/realtime/src/game/tuning';
import { measureScenario, simulationInput } from '../../apps/realtime/src/game/scenarios';

let messageNumber = 0;
function active(options: EngineOptions = {}) {
  const engine = new GameEngine({ source: 'simulation', channelId: 'simulation-channel', ...options });
  engine.ready(); engine.start(); engine.advance(3000); return engine;
}
function pull(engine: GameEngine, team: TeamId = 'coral', user = `viewer-${messageNumber}`, id = `message-${++messageNumber}`, occurredAt = engine.simulationClockMs) {
  return engine.ingest(simulationInput(team, user, id, occurredAt));
}
function crew(engine: GameEngine, team: TeamId, count: number, prefix = 'crew') { for (let i = 0; i < count; i++) pull(engine, team, `${prefix}-${i}`); }

describe('fixed-step momentum physics', () => {
  it('produces byte-identical snapshots across different update/frame cadences', () => {
    const run = (chunk: number) => {
      const engine = active({ tuning: { endpointWins: false } });
      engine.ingest(simulationInput('coral', 'a', 'one', 3000));
      for (let time = 0; time < 2000; time += chunk) engine.advance(Math.min(chunk, 2000 - time));
      engine.ingest(simulationInput('mint', 'b', 'two', 5000));
      for (let time = 0; time < 5000; time += chunk) engine.advance(Math.min(chunk, 5000 - time));
      return engine.snapshot();
    };
    for (const chunk of [1, 7, 16, 20, 33, 50, 100, 500]) expect(run(chunk)).toEqual(run(20));
  });
  it('does not advance any physics on partial timesteps', () => {
    const engine = active(); pull(engine); const before = engine.snapshot(); engine.advance(19);
    expect(engine.snapshot()).toEqual(before); engine.advance(1); expect(engine.snapshot().tick).toBe(before.tick + 1);
  });
  it('accelerates after a burst, retains momentum and decays to rest without further participation', () => {
    const engine = active(); pull(engine); engine.advance(100);
    const initial = engine.snapshot(); expect(initial.velocity).toBeLessThan(0); expect(initial.teams.coral.force).toBeGreaterThan(0);
    engine.advance(300); expect(engine.snapshot().velocity).toBeLessThan(initial.velocity);
    engine.advance(15_000); const quiet = engine.snapshot();
    expect(quiet.teams.coral.force).toBeLessThan(initial.teams.coral.force * 0.001);
    expect(Math.abs(quiet.velocity)).toBeLessThan(0.0001); expect(quiet.position).toBeLessThan(initial.position);
  });
  it('caps velocity, activity, position and normalized overlay coordinates during sustained bursts', () => {
    const engine = active({ tuning: { endpointWins: false } });
    for (let batch = 0; batch < 6; batch++) { crew(engine, 'coral', 100, `batch-${batch}`); engine.advance(500); }
    engine.advance(5000); const value = engine.snapshot();
    expect(value.position).toBe(-1); expect(value.overlayPosition).toBe(0); expect(Math.abs(value.velocity)).toBeLessThanOrEqual(GAME_TUNING.maxVelocity);
    expect(value.teams.coral.force).toBeLessThanOrEqual(GAME_TUNING.maxActivity * 1.75); expect(value.state).toBe('ACTIVE');
    crew(engine, 'mint', 100, 'opponents'); engine.advance(2000); expect(engine.snapshot().position).toBeGreaterThan(-1);
  });
  it('allows coordinated opposition to reverse momentum and emits a meaningful swing once', () => {
    const engine = active({ tuning: { endpointWins: false } }); crew(engine, 'coral', 6); engine.advance(500); const before = engine.snapshot();
    crew(engine, 'mint', 20, 'opposition'); engine.advance(1200); const after = engine.snapshot();
    expect(before.velocity).toBeLessThan(-0.06); expect(after.velocity).toBeGreaterThan(0.06);
    expect(after.events.filter(e => e.type === 'MOMENTUM_SWING')).toHaveLength(1);
  });
  it('rejects invalid elapsed time and invalid tuning/configuration', () => {
    const engine = active(); for (const value of [-1, NaN, Infinity]) expect(() => engine.advance(value)).toThrow();
    expect(() => active({ tuning: { damping: 0 } })).toThrow();
    expect(() => active({ tuning: { repeatWeights: [NaN] } })).toThrow();
  });
});

describe('distinct-user team combos', () => {
  it('requires three distinct accepted viewers and upgrades at six and ten, bounded at 1.75', () => {
    const engine = active(); crew(engine, 'coral', 2); engine.advance(20); expect(engine.snapshot().teams.coral.combo.level).toBe(0);
    pull(engine, 'coral', 'third'); engine.advance(20); expect(engine.snapshot().teams.coral.combo.level).toBe(1);
    crew(engine, 'coral', 3, 'new'); engine.advance(20); expect(engine.snapshot().teams.coral.combo.level).toBe(2);
    crew(engine, 'coral', 10, 'more'); engine.advance(20); const snapshot = engine.snapshot();
    expect(snapshot.teams.coral.combo.multiplier).toBe(1.75); expect(snapshot.events.filter(e => e.type === 'TEAM_COMBO_UPGRADED')).toHaveLength(2);
  });
  it('counts repeat participation once inside the rolling eligibility window', () => {
    const engine = active({ config: { ...DEFAULT_CONFIG, cooldownSeconds: 1 } });
    for (let n = 0; n < 5; n++) { pull(engine, 'coral', 'same-viewer'); engine.advance(1000); }
    expect(engine.snapshot().teams.coral.combo.level).toBe(0); expect(engine.snapshot().uniqueViewers).toBe(1);
  });
  it('prunes distinct viewers outside the rolling window', () => {
    const engine = active(); pull(engine, 'coral', 'one'); engine.advance(1000); pull(engine, 'coral', 'two'); engine.advance(2100);
    pull(engine, 'coral', 'three'); engine.advance(20); expect(engine.snapshot().teams.coral.combo.level).toBe(0);
  });
  it('expires without refresh, enforces cooldown, and requires fresh coordination for reactivation', () => {
    const engine = active({ tuning: { endpointWins: false } }); crew(engine, 'coral', 3); engine.advance(1000);
    crew(engine, 'coral', 3, 'upgrade'); engine.advance(2000);
    let value = engine.snapshot(); expect(value.teams.coral.combo.level).toBe(0); expect(value.teams.coral.combo.cooldownMs).toBe(2000);
    expect(value.events.filter(e => e.type === 'TEAM_COMBO_EXPIRED')).toHaveLength(1);
    crew(engine, 'coral', 10, 'cooldown'); engine.advance(2000); expect(engine.snapshot().teams.coral.combo.level).toBe(0);
    crew(engine, 'coral', 3, 'fresh'); engine.advance(20); value = engine.snapshot();
    expect(value.teams.coral.combo.level).toBe(1); expect(value.events.filter(e => e.type === 'TEAM_COMBO_STARTED')).toHaveLength(2);
  });
});

describe('fair participation and ingestion bounds', () => {
  it('rejects duplicate IDs even with a different user or team', () => {
    const engine = active(); expect(pull(engine, 'coral', 'one', 'same-id')).toBeNull();
    expect(pull(engine, 'mint', 'two', 'same-id')).toBe('duplicate'); expect(engine.snapshot().diagnostics.accepted).toBe(1);
  });
  it('enforces the per-user cooldown exactly at its boundary', () => {
    const engine = active(); pull(engine, 'coral', 'one'); engine.advance(1980); expect(pull(engine, 'coral', 'one')).toBe('cooldown');
    engine.advance(20); expect(pull(engine, 'coral', 'one')).toBeNull();
  });
  it('preserves repeat pulls with diminishing returns and bounds repeat contributions per 10 seconds', () => {
    const engine = active({ config: { ...DEFAULT_CONFIG, cooldownSeconds: 1 } });
    for (let n = 0; n < 5; n++) { expect(pull(engine, 'coral', 'one')).toBeNull(); engine.advance(1000); }
    expect(engine.snapshot().inputs.filter(i => i.accepted).map(i => i.weight).reverse()).toEqual([1, 0.7, 0.5, 0.35, 0.25]);
    expect(pull(engine, 'coral', 'one')).toBe('repeat_limit'); engine.advance(5000); expect(pull(engine, 'coral', 'one')).toBeNull();
  });
  it('locks a viewer to the first accepted team for the round', () => {
    const engine = active(); pull(engine, 'coral', 'one'); engine.advance(2000);
    expect(pull(engine, 'mint', 'one')).toBe('team_locked'); expect(pull(engine, 'coral', 'one')).toBeNull();
    expect(pull(active(), 'mint', 'one')).toBeNull();
  });
  it('rejects late, future, foreign-channel and wrong-source events', () => {
    const engine = active(); engine.advance(6000);
    expect(pull(engine, 'coral', 'one', 'old', 2999)).toBe('late'); expect(pull(engine, 'coral', 'one', 'stale', 3000)).toBe('late');
    expect(pull(engine, 'coral', 'one', 'future', 11_000)).toBe('late');
    const input = simulationInput('coral', 'one', 'wrong', 9000);
    expect(engine.ingest({ ...input, channelId: 'another' })).toBe('wrong_source'); expect(engine.ingest({ ...input, source: 'twitch' })).toBe('wrong_source');
  });
  it('handles bursts with a per-tick cap and a replenishing room token bucket', () => {
    const engine = active(); crew(engine, 'coral', 1000); expect(engine.snapshot().diagnostics.accepted).toBe(128);
    engine.advance(20); crew(engine, 'mint', 100, 'mint'); expect(engine.snapshot().diagnostics.accepted).toBe(202);
    expect(engine.snapshot().diagnostics.reasons.rate_limited).toBe(898);
    engine.advance(1000); expect(pull(engine, 'mint', 'after-refill')).toBeNull();
  });
  it('checks a spammer cooldown before consuming the shared room allowance', () => {
    const engine = active(); pull(engine, 'coral', 'spammer');
    for (let n = 0; n < 5000; n++) pull(engine, 'coral', 'spammer');
    crew(engine, 'mint', 50, 'coordinated'); expect(engine.snapshot().teams.mint.contributions).toBe(50);
    expect(engine.snapshot().diagnostics.reasons.cooldown).toBe(5000); expect(engine.snapshot().inputs.length).toBeLessThanOrEqual(40);
  });
  it('bounds users and accepted-ID state without eviction that would bypass fairness', () => {
    const users = active({ tuning: { maxUsers: 2 } }); crew(users, 'coral', 4); expect(users.snapshot().diagnostics.trackedUsers).toBe(2); expect(users.snapshot().diagnostics.reasons.capacity).toBe(2);
    const ids = active({ tuning: { maxMessageIds: 2 } }); crew(ids, 'mint', 4); expect(ids.snapshot().diagnostics.trackedIds).toBe(2); expect(ids.snapshot().diagnostics.reasons.capacity).toBe(2);
  });
});

describe('explicit round lifecycle and authority', () => {
  it('requires READY and countdown, rejecting pre-round participation and repeated starts', () => {
    const engine = new GameEngine({ source: 'simulation', channelId: 'simulation-channel' });
    expect(engine.start()).toBe(false); expect(engine.ready()).toBe(true); expect(engine.ready()).toBe(false); expect(engine.start()).toBe(true); expect(engine.start()).toBe(false);
    expect(pull(engine)).toBe('inactive'); engine.advance(2980); expect(engine.state).toBe('COUNTDOWN'); engine.advance(20); expect(engine.state).toBe('ACTIVE'); expect(engine.snapshot().remainingMs).toBe(45_000);
  });
  it('freezes position, force, combo and match clock during pause and rejects events from the gap', () => {
    const engine = active(); crew(engine, 'coral', 3); engine.advance(500); expect(engine.pause()).toBe(true); const before = engine.snapshot();
    expect(pull(engine)).toBe('inactive'); engine.advance(10_000); const after = engine.snapshot();
    for (const key of ['position', 'velocity', 'elapsedMs', 'remainingMs', 'teams'] as const) expect(after[key]).toEqual(before[key]);
    expect(engine.resume()).toBe(true); expect(pull(engine, 'mint', 'gap', 'gap', 5000)).toBe('late'); expect(pull(engine, 'mint', 'fresh')).toBeNull();
    engine.advance(20); expect(engine.snapshot().elapsedMs).toBe(before.elapsedMs + 20);
  });
  it('can pause/resume a countdown without restarting it', () => {
    const engine = new GameEngine({ source: 'simulation' }); engine.ready(); engine.start(); engine.advance(1000); engine.pause(); engine.advance(5000);
    expect(engine.snapshot().countdownMs).toBe(2000); engine.resume(); engine.advance(2000); expect(engine.state).toBe('ACTIVE');
  });
  it('expires an abandoned pause and produces no winner', () => {
    const engine = active(); engine.pause('connection_lost'); engine.advance(60_000); expect(engine.snapshot().result).toMatchObject({ reason: 'abandoned', winner: null, elapsedMs: 0 });
    expect(engine.resume()).toBe(false);
  });
  it('determines a positional winner on time expiration and emits only one result', () => {
    const engine = active({ tuning: { endpointWins: false } }); pull(engine); engine.advance(45_000);
    const before = engine.snapshot(); expect(before.result).toMatchObject({ winner: 'coral', reason: 'time', elapsedMs: 45_000 });
    engine.advance(90_000); expect(engine.snapshot()).toEqual(before); expect(engine.abandon()).toBe(false); expect(before.events.filter(e => e.type === 'ROUND_FINISHED')).toHaveLength(1);
  });
  it('distinguishes a participation tie from no participation and ends without overtime', () => {
    const engine = active(); pull(engine, 'coral', 'a'); pull(engine, 'mint', 'b'); engine.advance(45_000);
    expect(engine.snapshot().result).toMatchObject({ winner: null, reason: 'tie', finalPosition: 0 });
    const quiet = active(); quiet.advance(45_000); expect(quiet.snapshot().result).toMatchObject({ reason: 'no_participation', winner: null });
  });
  it('supports an endpoint hold win, an explicit abandon and clean repeated rounds', () => {
    const engine = active(); crew(engine, 'coral', 100); engine.advance(5000); expect(engine.snapshot().result).toMatchObject({ reason: 'endpoint', winner: 'coral' });
    const abandoned = active(); abandoned.abandon(); expect(abandoned.snapshot().result?.winner).toBeNull();
    for (let round = 0; round < 20; round++) { const fresh = active({ roundId: `rematch-${round}` }); expect(fresh.snapshot().diagnostics.trackedIds).toBe(0); expect(pull(fresh, 'mint', 'same-user', 'same-id')).toBeNull(); fresh.abandon(); }
  });
  it('announces only five final countdown seconds', () => {
    const engine = active(); engine.advance(45_000);
    expect(engine.snapshot().events.filter(e => e.type === 'ROUND_COUNTDOWN' && e.phase === 'final').map(e => 'seconds' in e && e.seconds)).toEqual([5, 4, 3, 2, 1]);
  });
  it('protects authority from mutable snapshot copies, including nested result/event data', () => {
    const engine = active(); pull(engine); engine.advance(45_000); const snapshot = engine.snapshot();
    snapshot.position = 1; snapshot.result!.winner = 'mint'; snapshot.teams.coral.combo.level = 3;
    const finish = snapshot.events.find(e => e.type === 'ROUND_FINISHED')!;
    if (finish.type === 'ROUND_FINISHED') finish.result.contributions.coral = 1_000_000;
    expect(engine.snapshot().result).toMatchObject({ winner: 'coral', contributions: { coral: 1 } });
  });
});

describe('rendering contracts and reproducible scenarios', () => {
  it('runtime-validates snapshots and rejects forged result/physics/event payloads', () => {
    const snapshot = active().snapshot(); expect(isGameSnapshot(snapshot)).toBe(true);
    for (const changed of [{ position: 2 }, { velocity: NaN }, { result: { winner: 'mint' } }, { state: 'FINISHED' }, { events: [{ type: 'UNKNOWN' }] }, { teams: {} }]) expect(isGameSnapshot({ ...snapshot, ...changed })).toBe(false);
  });
  it('interpolates only within ordered active snapshots of the same round and never extrapolates', () => {
    const engine = active(); const from = engine.snapshot(); pull(engine); engine.advance(1000); const to = engine.snapshot();
    expect(interpolatePosition(from, to, 0.5)).toBe((from.position + to.position) / 2);
    expect(interpolatePosition(from, to, 2)).toBe(to.position); expect(interpolatePosition(from, { ...to, roundId: 'new' }, 0)).toBe(to.position);
    expect(interpolatePosition(from, { ...to, state: 'FINISHED' }, 0)).toBe(to.position); expect(to.result).toBeNull();
  });
  for (const scenario of GAME_SCENARIOS) it(`replays ${scenario} identically for seed 42`, () => {
    const first = measureScenario(scenario); expect(first).toEqual(measureScenario(scenario)); expect(first.snapshot.state).toBe('FINISHED'); expect(isGameSnapshot(first.snapshot)).toBe(true);
  });
  it('proves a late comeback and coordinated users overcoming a lone spammer', () => {
    const comeback = measureScenario('late_comeback'); expect(comeback.minimum).toBeLessThan(-0.35); expect(comeback.winner).toBe('mint'); expect(comeback.comebacks).toBe(1);
    const spam = measureScenario('spam_attempt'); expect(spam.winner).toBe('mint'); expect(spam.pipelineDuplicates).toBeGreaterThan(1000); expect(spam.snapshot.teams.coral.combo.level).toBe(0); expect(spam.snapshot.teams.coral.contributions).toBeLessThanOrEqual(25);
    const gap = measureScenario('connection_interruption'); expect(gap.wallMs - gap.activeMs).toBe(5000); expect(gap.snapshot.diagnostics.reasons.inactive).toBeGreaterThan(0);
  });
});
