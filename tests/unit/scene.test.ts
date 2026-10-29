import { describe, expect, it } from 'vitest';
import type { GameSnapshot, GameVisualEvent } from '../../packages/contracts/src/index';
import { GameEngine } from '../../apps/realtime/src/game/engine';
import { simulationInput } from '../../apps/realtime/src/game/scenarios';
import { SCENE, SceneTimeline, crewAnimation, crewCount, resultCopy, type CrewAnimation } from '../../apps/web/src/lib/scene/presentation';
import { footPlant, ropeHeight, sampleRig } from '../../apps/web/src/lib/scene/rig';

function snapshot(): GameSnapshot { const engine = new GameEngine({ source: 'simulation', channelId: 'simulation-channel' }); engine.ready(); engine.start(); engine.advance(3000); return engine.snapshot(); }
const event = (type: 'TEAM_LEAD_CHANGED' | 'MOMENTUM_SWING' | 'COMEBACK_DETECTED', sequence: number): GameVisualEvent => ({ type, team: 'mint', atMs: 0, sequence, roundId: 'round-0' });
function combo(sequence = 1): GameVisualEvent { return { type: 'TEAM_COMBO_STARTED', team: 'coral', level: 1, multiplier: 1.25, durationMs: 3000, atMs: 0, sequence, roundId: 'round-0' }; }

describe('bounded state-driven art direction', () => {
  it('uses a bounded deterministic aggregate roster, including a truthful empty mascots state', () => {
    expect([0, 1, 2, 3, 6, 10, 5000].map(crewCount)).toEqual([2, 2, 2, 3, 4, 5, 5]);
    expect(crewCount(1_000_000)).toBe(SCENE.maxCrew);
  });
  it('maps idle, preparation, pressure, imbalance and combos into coherent poses', () => {
    const game = snapshot(); expect(crewAnimation(game, 'coral')).toBe('idle');
    game.state = 'COUNTDOWN'; expect(crewAnimation(game, 'coral')).toBe('preparing');
    game.state = 'ACTIVE'; game.teams.coral.force = 2; expect(crewAnimation(game, 'coral')).toBe('pulling');
    game.teams.coral.force = 5; expect(crewAnimation(game, 'coral')).toBe('strong_pulling');
    game.position = 0.6; expect(crewAnimation(game, 'coral')).toBe('losing_balance');
    game.teams.coral.combo.level = 1; expect(crewAnimation(game, 'coral')).toBe('combo');
    game.state = 'PAUSED'; expect(crewAnimation(game, 'coral')).toBe('combo');
  });
  it('takes victory/defeat only from server result, even when velocity/position suggest otherwise', () => {
    const game = snapshot(); game.state = 'FINISHED'; game.position = 1; game.velocity = 0.7;
    game.result = { roundId: game.roundId, winner: 'coral', reason: 'time', finalPosition: -0.1, elapsedMs: 45000, uniqueViewers: 10, contributions: { coral: 10, mint: 10 } };
    expect(crewAnimation(game, 'coral')).toBe('victory'); expect(crewAnimation(game, 'mint')).toBe('defeat');
    expect(resultCopy(game).detail).toContain('final whistle');
    game.result.winner = null; game.result.reason = 'tie'; expect(crewAnimation(game, 'mint')).toBe('idle'); expect(resultCopy(game).title).toBe('A perfect balance');
    game.result.reason = 'abandoned'; expect(resultCopy(game).title).toBe('Round abandoned');
  });
});

describe('grounded original vector rig', () => {
  const states: CrewAnimation[] = ['idle', 'preparing', 'pulling', 'strong_pulling', 'losing_balance', 'combo', 'victory', 'defeat'];
  for (const state of states) it(`${state}: finite, deterministic connected joints at both rope limits`, () => {
    for (const displacement of [-150, -50, 0, 50, 150]) for (const at of [0, 150, 350, 850, 1400]) {
      const pose = sampleRig(state, at, displacement, 620, 0.5, 2, false, at);
      expect(pose).toEqual(sampleRig(state, at, displacement, 620, 0.5, 2, false, at));
      for (const value of Object.values(pose)) if (typeof value === 'object') { expect(Number.isFinite(value.x)).toBe(true); expect(Number.isFinite(value.y)).toBe(true); }
      expect(Math.hypot(pose.leftElbow.x - pose.shoulder.x, pose.leftElbow.y - pose.shoulder.y)).toBeCloseTo(38, 5);
      expect(Math.hypot(pose.leftElbow.x - pose.leftHand.x, pose.leftElbow.y - pose.leftHand.y)).toBeCloseTo(34, 5);
      expect(Math.hypot(pose.leftKnee.x - pose.hip.x, pose.leftKnee.y - pose.hip.y)).toBeCloseTo(36, 5);
      expect(Math.hypot(pose.leftKnee.x - pose.leftFoot.x, pose.leftKnee.y - pose.leftFoot.y)).toBeCloseTo(34, 5);
    }
  });
  it('holds both hands exactly on the shared rope curve while the torso counter-pulls', () => {
    for (const state of ['idle', 'preparing', 'pulling', 'strong_pulling', 'losing_balance', 'combo'] as CrewAnimation[]) for (const tension of [0, 0.3, 1]) {
      const pose = sampleRig(state, 355, 38, 620, tension, 0);
      expect(pose.leftHand.y).toBe(ropeHeight(620 + pose.leftHand.x, tension));
      expect(pose.rightHand.y).toBe(ropeHeight(620 + pose.rightHand.x, tension));
    }
  });
  it('plants a foot in world space while the rope/body move, then lifts a bounded step', () => {
    for (const displacement of [0, 2, 5, 10, 15]) expect(footPlant(displacement, 0).x + displacement).toBe(0);
    expect(footPlant(21, 0).lift).toBeGreaterThan(0); expect(footPlant(24, 0).lift).toBe(0);
    for (let d = -150; d <= 150; d++) expect(footPlant(d, 0).lift).toBeLessThanOrEqual(6);
  });
  it('removes cyclic/hop animation under reduced motion and leaves semantic poses visible', () => {
    for (const state of states) expect(sampleRig(state, 0, 0, 620, 0, 0, true, 0)).toEqual(sampleRig(state, 700, 0, 620, 0, 0, true, 700));
  });
  it('keeps the entire crowd within the SVG at both endpoint positions', () => {
    for (const displacement of [-SCENE.travel, SCENE.travel]) for (let slot = 0; slot < SCENE.maxCrew; slot++) {
      const left = 620 - slot * 90 + displacement, right = 980 + slot * 90 + displacement;
      expect(left - 65).toBeGreaterThanOrEqual(0); expect(right + 65).toBeLessThanOrEqual(SCENE.width);
    }
  });
});

describe('visual event consumption and interpolation authority', () => {
  it('does not replay pre-existing event history when joining a room', () => {
    const game = snapshot(); game.events = [combo()]; game.lastEventSequence = 1; const timeline = new SceneTimeline(); timeline.accept(game, 100);
    expect(timeline.frame(101, true, false)?.coralPulse).toBe(0);
  });
  it('consumes fresh combo events once, without refreshing reactions on repeated snapshots', () => {
    const game = snapshot(); const timeline = new SceneTimeline(); timeline.accept(game, 0);
    const next = { ...game, tick: game.tick + 1, events: [combo(4)], lastEventSequence: 4 }; timeline.accept(next, 100);
    expect(timeline.frame(100, true, false)?.coralPulse).toBe(1);
    timeline.accept({ ...next, tick: next.tick + 1 }, 400);
    expect(timeline.frame(950, true, false)?.coralPulse).toBe(0); expect(timeline.frame(400, true, true)?.coralPulse).toBe(0);
  });
  it('coalesces lead/swing/comeback into one prioritized readable cue, skipping stale and foreign events', () => {
    const game = snapshot(); const timeline = new SceneTimeline(); timeline.accept(game, 0);
    timeline.accept({ ...game, tick: game.tick + 1, events: [event('COMEBACK_DETECTED', 4), event('TEAM_LEAD_CHANGED', 5), event('MOMENTUM_SWING', 6)], lastEventSequence: 6 }, 100);
    expect(timeline.frame(101, true, false)?.cue?.type).toBe('comeback'); expect(timeline.frame(1800, true, false)?.cue).toBeNull();
    timeline.accept({ ...game, tick: game.tick + 2, elapsedMs: 5000, events: [event('TEAM_LEAD_CHANGED', 7), { ...event('MOMENTUM_SWING', 8), roundId: 'other' }], lastEventSequence: 8 }, 2000);
    expect(timeline.frame(2001, true, false)?.cue).toBeNull();
  });
  it('clamps interpolation, freezes on pause/loss and rejects out-of-order snapshots', () => {
    const game = snapshot(); const timeline = new SceneTimeline(); timeline.accept(game, 0);
    timeline.accept({ ...game, tick: game.tick + 1, position: 0.8, elapsedMs: 20 }, 100);
    expect(timeline.frame(150, true, false)?.position).toBeCloseTo(0.4); expect(timeline.frame(10_000, true, false)?.position).toBe(0.8);
    expect(timeline.frame(150, false, false)?.position).toBe(0.8); expect(timeline.frame(150, false, false)?.motion).toBe(false);
    timeline.accept(game, 200); expect(timeline.frame(250, true, false)?.position).toBe(0.8);
  });
  it('reveals the server result after one bounded celebration and settles a late join immediately', () => {
    const engine = new GameEngine({ source: 'simulation', channelId: 'simulation-channel' }); engine.ready(); engine.start(); engine.advance(3000);
    const timeline = new SceneTimeline(); timeline.accept(engine.snapshot(), 0);
    for (let i = 0; i < 10; i++) engine.ingest(simulationInput('coral', `user-${i}`, `id-${i}`, 3000));
    engine.advance(5000); const finished = engine.snapshot(); const saved = JSON.stringify(finished); timeline.accept(finished, 100);
    expect(timeline.frame(200, true, false)?.resultReady).toBe(false); expect(timeline.frame(1500, true, false)?.resultReady).toBe(true);
    const late = new SceneTimeline(); late.accept(finished, 100); expect(late.frame(100, true, false)?.resultReady).toBe(true);
    expect(JSON.stringify(finished)).toBe(saved);
  });
  it('snaps to a recovered authority without replaying missed combos or a finished celebration', () => {
    const game = snapshot(); const timeline = new SceneTimeline(); timeline.accept(game, 0);
    const resumed = { ...game, tick: game.tick + 200, position: -0.6, events: [combo(4)], lastEventSequence: 4 };
    timeline.recover(resumed, 5000); expect(timeline.frame(5000, true, false)?.position).toBe(-0.6); expect(timeline.frame(5000, true, false)?.coralPulse).toBe(0);
    resumed.state = 'FINISHED'; resumed.result = { roundId: game.roundId, winner: 'coral', reason: 'endpoint', finalPosition: -1, elapsedMs: 4000, uniqueViewers: 10, contributions: { coral: 10, mint: 0 } };
    timeline.recover(resumed, 10_000); expect(timeline.frame(10_000, true, false)?.resultReady).toBe(true);
  });
});
