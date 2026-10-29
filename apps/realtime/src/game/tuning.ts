/** Versioned, server-owned balance. Units and formulas: docs/GAME_DESIGN.md. */
export const GAME_TUNING = Object.freeze({
  stepMs: 20, publishMs: 100, countdownMs: 3000,
  forceHalfLifeMs: 1200, pullImpulse: 0.7, maxActivity: 18,
  acceleration: 0.16, damping: 2.4, maxVelocity: 0.7, mass: 1,
  endpointWins: true, endpointHoldMs: 400, tieEpsilon: 0.015,
  leadThreshold: 0.04, comebackThreshold: 0.35, swingVelocity: 0.06, swingCooldownMs: 3000,
  comboWindowMs: 3000, comboDurationMs: 3000, comboCooldownMs: 2000,
  repeatWindowMs: 10_000, repeatWeights: [1, 0.7, 0.5, 0.35, 0.25] as readonly number[],
  ratePerSecond: 100, burstCapacity: 200, maxInputsPerTick: 128,
  maxUsers: 5000, maxMessageIds: 50_000, lateAfterMs: 5000, futureToleranceMs: 1000,
  abandonAfterMs: 60_000, stallAfterMs: 1000,
});
export type GameTuning = { [K in keyof typeof GAME_TUNING]: typeof GAME_TUNING[K] extends number ? number : typeof GAME_TUNING[K] extends boolean ? boolean : readonly number[] };
export const COMBO_LEVELS = Object.freeze([
  { users: 3, multiplier: 1.25 }, { users: 6, multiplier: 1.5 }, { users: 10, multiplier: 1.75 },
]);
