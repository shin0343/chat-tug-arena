import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_SHOWDOWN, SHOWDOWN_TEMPLATES, TEMPLATE_COPY, choiceAction, hasShowdown, isRoundConfig, isShowdownOutcome, normalizeConfig, outcomeFor, validateRoundConfig, validateKeywords, type GameInputEvent } from '../../packages/contracts/src/index';
import { GameEngine } from '../../apps/realtime/src/game/engine';
import { ShowdownLedger } from '../../apps/realtime/src/game/showdowns';

const engine = (id = 'round-test') => { const e = new GameEngine({ roundId: id, source: 'simulation', channelId: 'simulation-channel', config: { ...DEFAULT_SHOWDOWN } }); e.ready(); e.start(); e.advance(3000); return e; };
const pull = (e: GameEngine, id: string, at = 3000, team: 'coral' | 'mint' = 'coral', userId = id) => e.ingest({ type: 'game.input', id, sequence: 1, source: 'simulation', channelId: 'simulation-channel', userId, displayName: 'Viewer', team, command: team === 'coral' ? '!coral' : '!mint', occurredAt: new Date(at).toISOString() } as GameInputEvent, at);

describe('showdown configuration and exact consequences', () => {
  it.each(SHOWDOWN_TEMPLATES)('provides a valid editable %s template and a concrete action for either winner', template => {
    const copy = TEMPLATE_COPY[template], config = { ...DEFAULT_SHOWDOWN, ...copy, template };
    expect(isRoundConfig(config)).toBe(true); expect(validateKeywords({ coral: copy.coral, mint: copy.mint })).toEqual({});
    expect(choiceAction(config, 'coral')).toContain(copy.coralName); expect(choiceAction(config, 'mint')).toContain(copy.mintName);
  });
  it('validates both custom actions, enums, choice duplication and single-line content', () => {
    expect(isRoundConfig({ ...DEFAULT_SHOWDOWN, consequenceType: 'custom' })).toBe(false);
    expect(isRoundConfig({ ...DEFAULT_SHOWDOWN, consequenceType: 'custom', coralAction: 'Use only a bow.', mintAction: 'Use only a sword.' })).toBe(true);
    for (const [key, value] of [['template', 'unknown'], ['startCondition', 'automatic'], ['consequenceType', 'remote_control'], ['coralAction', 'x'.repeat(121)], ['title', 'A\nB']] as const) expect(isRoundConfig({ ...DEFAULT_SHOWDOWN, [key]: value })).toBe(false);
    expect(validateRoundConfig({ ...DEFAULT_SHOWDOWN, coralName: 'Blue Mage', mintName: '  blue  mage ' }).mintName).toBeTruthy();
    expect(validateRoundConfig({ ...DEFAULT_SHOWDOWN, coralName: 'ＭＡＧＥ', mintName: 'mage' }).mintName).toBeTruthy();
    expect(isRoundConfig({ ...DEFAULT_CONFIG, template: 'character' })).toBe(false);
  });
  it('preserves legacy configuration while dropping unrecognized fields from normalized server state', () => {
    expect(normalizeConfig({ ...DEFAULT_CONFIG })).toEqual(DEFAULT_CONFIG); expect(hasShowdown(DEFAULT_CONFIG)).toBe(false);
    const config = normalizeConfig({ ...DEFAULT_SHOWDOWN, title: ' Question ', winner: 'mint', privileged: { key: 'forged' } } as typeof DEFAULT_SHOWDOWN);
    expect(config.title).toBe('Question'); expect(config).not.toHaveProperty('winner'); expect(config).not.toHaveProperty('privileged');
  });
  it('uses only the authoritative winner and freezes the selected custom action', () => {
    const e = engine(); pull(e, 'viewer'); e.advance(1500); e.finishNow();
    const game = e.snapshot(); game.config.consequenceType = 'custom'; game.config.coralAction = 'Equip the starter wand.'; game.config.mintAction = 'Equip the shield.';
    const result = outcomeFor(game, '2026-10-27T00:00:00.000Z')!;
    expect(result).toMatchObject({ winningChoice: 'Mage', action: 'Equip the starter wand.', winner: 'coral', source: 'simulation', committedAt: null });
    game.velocity = 0.7; game.position = 1; expect(outcomeFor(game, result.finishedAt)?.winningChoice).toBe('Mage');
    expect(isShowdownOutcome(result)).toBe(true); expect(isShowdownOutcome({ ...result, winningChoice: null })).toBe(false);
  });
});

describe('manual finish and useful contribution accounting', () => {
  it('finishes active or active-paused play at the server position without selecting a client winner', () => {
    const e = engine(); pull(e, 'viewer'); e.advance(1500); e.pause(); const x = e.snapshot().position;
    expect(e.finishNow()).toBe(true); expect(e.snapshot().result).toMatchObject({ reason: 'manual', winner: 'coral', finalPosition: x });
    expect(e.finishNow()).toBe(false); const frozen = e.snapshot(); e.advance(90000); expect(e.snapshot()).toEqual(frozen);
  });
  it('keeps ties and no-participation distinct and refuses ready/countdown finishes', () => {
    const e = engine(); expect(e.finishNow()).toBe(true); expect(e.snapshot().result?.reason).toBe('no_participation');
    const tied = engine(); pull(tied, 'c'); pull(tied, 'm', 3000, 'mint'); tied.advance(500); tied.finishNow(); expect(tied.snapshot().result).toMatchObject({ winner: null, reason: 'tie' });
    const waiting = new GameEngine({ source: 'simulation' }); waiting.ready(); expect(waiting.finishNow()).toBe(false); waiting.start(); expect(waiting.finishNow()).toBe(false); waiting.pause(); expect(waiting.finishNow()).toBe(false);
  });
  it('counts diminishing-return weights without changing accepted-pull totals', () => {
    const e = engine(); expect(pull(e, 'same')).toBeNull(); e.advance(2000); expect(pull(e, 'message-2', 5000, 'coral', 'same')).toBeNull();
    expect(e.snapshot().teams.coral).toMatchObject({ contributions: 2, effectiveContributions: 1.7, uniqueViewers: 1 });
  });
});

describe('bounded server-owned showdown history', () => {
  it('records once, returns copies and commits idempotently without changing the choice', () => {
    const ledger = new ShowdownLedger(), e = engine(); pull(e, 'viewer'); e.advance(1500); e.finishNow(); ledger.capture(e.snapshot(), '2026-10-27T00:00:00.000Z');
    const first = ledger.current(e.roundId)!; first.winningChoice = 'forged'; ledger.capture(e.snapshot()); expect(ledger.history()).toHaveLength(1); expect(ledger.current(e.roundId)?.winningChoice).toBe('Mage'); expect(ledger.pending).toBe(true);
    expect(ledger.commit('other')).toBe(false); expect(ledger.commit(e.roundId, '2026-10-27T00:01:00.000Z')).toBe(true); ledger.commit(e.roundId, '2026-10-27T00:02:00.000Z');
    expect(ledger.current(e.roundId)?.committedAt).toBe('2026-10-27T00:01:00.000Z'); expect(ledger.pending).toBe(false);
  });
  it('bounds history at 20 and never invents an action for neutral or legacy rounds', () => {
    const ledger = new ShowdownLedger();
    for (let n = 0; n < 25; n++) { const e = engine(`r-${n}`); e.finishNow(); ledger.capture(e.snapshot()); }
    expect(ledger.history()).toHaveLength(20); expect(ledger.history()[0]?.roundId).toBe('r-24'); expect(ledger.current('r-0')).toBeNull(); expect(ledger.pending).toBe(false); expect(ledger.commit('r-24')).toBe(false);
    const e = engine('legacy'), game = e.snapshot(); game.config = { ...DEFAULT_CONFIG }; e.finishNow(); expect(outcomeFor({ ...game, result: e.snapshot().result }, new Date().toISOString())).toBeNull();
  });
});
