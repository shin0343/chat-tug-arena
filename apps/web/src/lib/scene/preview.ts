import { DEFAULT_CONFIG, INPUT_REJECTIONS, type GameSnapshot, type InputRejection, type RoundConfig } from '@chat-tug/contracts';

/** Drawing-only state for labeled previews. Never published or used for game authority. */
export function previewGame(config: Readonly<RoundConfig> = DEFAULT_CONFIG, position = 0): GameSnapshot {
  const team = () => ({ force: 0, intensity: 0, uniqueViewers: 0, contributions: 0, combo: { level: 0, multiplier: 1, uniqueUsers: 0, remainingMs: 0, cooldownMs: 0 } });
  const x = Math.max(-1, Math.min(1, position));
  return {
    version: 1, roundId: 'preview', state: 'IDLE', source: 'idle', config: { ...config },
    tick: 0, stepMs: 20, clockMs: 0, elapsedMs: 0, remainingMs: config.durationSeconds * 1000, countdownMs: 0,
    position: x, overlayPosition: (x + 1) / 2, velocity: 0, momentum: 0, direction: 0, tension: 0, leader: null,
    teams: { coral: team(), mint: team() }, uniqueViewers: 0, pauseReason: null, result: null,
    events: [], lastEventSequence: 0, inputs: [], diagnostics: { accepted: 0, rejected: 0, reasons: Object.fromEntries(INPUT_REJECTIONS.map(r => [r, 0])) as Record<InputRejection, number>, trackedUsers: 0, trackedIds: 0 },
  };
}
