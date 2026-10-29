import {
  DEFAULT_CONFIG, INPUT_REJECTIONS, normalizeConfig, isRoundConfig,
  type RoundConfig, type TeamId, type GameInputEvent, type GameSnapshot,
  type RoundState, type PauseReason, type GameVisualEvent, type RoundResult,
  type InputReceipt, type InputRejection, type InputSource,
} from '@chat-tug/contracts';
import { COMBO_LEVELS, GAME_TUNING, type GameTuning } from './tuning.js';

interface Participant { team: TeamId; lastAt: number; recent: number[]; }
interface Team {
  activity: number; pending: number; contributions: number; effectiveContributions: number; viewers: number;
  comboUsers: Map<string, number>; level: number; expires: number; cooldownUntil: number;
}
const makeTeam = (): Team => ({ activity: 0, pending: 0, contributions: 0, effectiveContributions: 0, viewers: 0, comboUsers: new Map(), level: 0, expires: 0, cooldownUntil: 0 });
type EventPayload = GameVisualEvent extends infer E ? E extends GameVisualEvent ? Omit<E, 'roundId' | 'sequence' | 'atMs'> : never : never;
export interface EngineOptions { roundId?: string; config?: RoundConfig; source?: InputSource | 'idle'; channelId?: string; epochMs?: number; tuning?: Partial<GameTuning>; }

/** Pure deterministic authority. All time is supplied by the caller; no I/O, timers or randomness. */
export class GameEngine {
  readonly tuning: GameTuning;
  readonly config: RoundConfig;
  readonly roundId: string;
  readonly source: InputSource | 'idle';
  readonly channelId: string;
  private epochMs: number;
  state: RoundState = 'IDLE';
  private pausedFrom: 'COUNTDOWN' | 'ACTIVE' = 'ACTIVE';
  private pausedAt = 0;
  private pauseReason: PauseReason | null = null;
  private minimumMessageAt: number;
  private tick = 0;
  private clockMs = 0;
  private activeMs = 0;
  private countdownMs = 0;
  private accumulator = 0;
  private position = 0;
  private velocity = 0;
  private leader: TeamId | null = null;
  private endpointMs = 0;
  private lastDirection = 0;
  private swingAt = -Infinity;
  private readonly fellBehind = { coral: false, mint: false };
  private readonly comebackEmitted = { coral: false, mint: false };
  private readonly teams = { coral: makeTeam(), mint: makeTeam() };
  private readonly users = new Map<string, Participant>();
  private readonly ids = new Set<string>();
  private tokens: number;
  private inputsThisTick = 0;
  private accepted = 0;
  private rejected = 0;
  private receiptSequence = 0;
  private readonly reasons = Object.fromEntries(INPUT_REJECTIONS.map(r => [r, 0])) as Record<InputRejection, number>;
  private readonly inputs: InputReceipt[] = [];
  private readonly events: GameVisualEvent[] = [];
  private eventSequence = 0;
  private result: RoundResult | null = null;
  private readonly forceDecay: number;
  private readonly velocityDecay: number;
  get simulationClockMs() { return this.clockMs; }
  get matchElapsedMs() { return this.activeMs; }
  constructor(options: EngineOptions = {}) {
    this.tuning = { ...GAME_TUNING, ...options.tuning };
    for (const [key, value] of Object.entries(this.tuning)) {
      if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) throw new Error(`Invalid tuning: ${key}`);
    }
    if (!this.tuning.repeatWeights.length || this.tuning.repeatWeights.some(v => !Number.isFinite(v) || v <= 0 || v > 1)) throw new Error('Invalid repeat weights');
    if (!isRoundConfig(options.config ?? DEFAULT_CONFIG) || !Number.isFinite(options.epochMs ?? 0)) throw new Error('Invalid engine configuration');
    this.config = normalizeConfig(options.config ?? DEFAULT_CONFIG);
    this.roundId = options.roundId ?? 'round-0'; this.source = options.source ?? 'idle'; this.channelId = options.channelId ?? '';
    this.epochMs = options.epochMs ?? 0; this.minimumMessageAt = this.epochMs;
    this.tokens = this.tuning.burstCapacity;
    this.forceDecay = Math.pow(0.5, this.tuning.stepMs / this.tuning.forceHalfLifeMs);
    this.velocityDecay = Math.exp(-this.tuning.damping * this.tuning.stepMs / 1000);
  }
  ready() { if (this.state !== 'IDLE') return false; this.state = 'READY'; return true; }
  start(atMs = this.epochMs + this.clockMs) {
    if (this.state !== 'READY' || this.source === 'idle') return false;
    this.epochMs = atMs - this.clockMs;
    this.state = 'COUNTDOWN'; this.countdownMs = this.tuning.countdownMs;
    this.emit({ type: 'ROUND_COUNTDOWN', phase: 'start', seconds: Math.ceil(this.countdownMs / 1000) }); return true;
  }
  pause(reason: PauseReason = 'manual') {
    if (this.state !== 'ACTIVE' && this.state !== 'COUNTDOWN') return false;
    this.pausedFrom = this.state; this.state = 'PAUSED'; this.pausedAt = this.clockMs; this.pauseReason = reason; return true;
  }
  resume(atMs = this.epochMs + this.clockMs) {
    if (this.state !== 'PAUSED') return false;
    this.epochMs = atMs - this.clockMs;
    this.state = this.pausedFrom; this.pauseReason = null;
    // Commands from the gap are never applied after reconnect/resume.
    this.minimumMessageAt = this.epochMs + this.clockMs; return true;
  }
  abandon() {
    if (!['READY', 'COUNTDOWN', 'ACTIVE', 'PAUSED'].includes(this.state)) return false;
    this.finish('abandoned'); return true;
  }
  finishNow() {
    if (this.state !== 'ACTIVE' && !(this.state === 'PAUSED' && this.pausedFrom === 'ACTIVE')) return false;
    this.finish(this.users.size === 0 ? 'no_participation' : Math.abs(this.position) <= this.tuning.tieEpsilon ? 'tie' : 'manual');
    return true;
  }
  /** Receipt time is server-owned epoch time. Apply to the next fixed tick in arrival order. */
  ingest(input: GameInputEvent, receivedAtMs = this.epochMs + this.clockMs): InputRejection | null {
    let reason: InputRejection | null = null;
    const occurred = Date.parse(input.occurredAt);
    const user = this.users.get(input.userId);
    if (this.state !== 'ACTIVE') reason = 'inactive';
    else if (input.source !== this.source || input.channelId !== this.channelId) reason = 'wrong_source';
    else if (!Number.isFinite(occurred) || occurred < this.minimumMessageAt || receivedAtMs - occurred > this.tuning.lateAfterMs || occurred - receivedAtMs > this.tuning.futureToleranceMs) reason = 'late';
    else if (this.ids.has(input.id)) reason = 'duplicate';
    else if (user && user.team !== input.team) reason = 'team_locked';
    else if (user && this.activeMs - user.lastAt < this.config.cooldownSeconds * 1000) reason = 'cooldown';
    const recent = user?.recent;
    if (!reason && recent) {
      while (recent.length && recent[0]! <= this.activeMs - this.tuning.repeatWindowMs) recent.shift();
      if (recent.length >= this.tuning.repeatWeights.length) reason = 'repeat_limit';
    }
    if (!reason && (this.tokens < 1 || this.inputsThisTick >= this.tuning.maxInputsPerTick)) reason = 'rate_limited';
    if (!reason && ((!user && this.users.size >= this.tuning.maxUsers) || this.ids.size >= this.tuning.maxMessageIds)) reason = 'capacity';
    let weight = 0;
    if (reason) { this.rejected++; this.reasons[reason]++; }
    else {
      const participant = user ?? { team: input.team, lastAt: -Infinity, recent: [] };
      weight = this.tuning.repeatWeights[participant.recent.length]!;
      if (!user) { this.users.set(input.userId, participant); this.teams[input.team].viewers++; }
      participant.lastAt = this.activeMs; participant.recent.push(this.activeMs);
      this.ids.add(input.id); this.tokens--; this.inputsThisTick++; this.accepted++;
      const t = this.teams[input.team]; t.pending += weight * this.tuning.pullImpulse; t.contributions++; t.effectiveContributions += weight;
      if (this.activeMs >= t.cooldownUntil) t.comboUsers.set(input.userId, this.activeMs);
    }
    // Sample rejected diagnostic receipts; counters remain exact during message floods.
    if (!reason || this.rejected % 16 === 1) {
      this.inputs.unshift({ sequence: ++this.receiptSequence, atMs: this.activeMs, team: input.team, viewer: input.displayName.slice(0, 128), accepted: !reason, reason, weight });
      if (this.inputs.length > 40) this.inputs.pop();
    }
    return reason;
  }
  advance(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error('Elapsed time must be finite and nonnegative');
    this.accumulator += milliseconds;
    while (this.accumulator >= this.tuning.stepMs) { this.accumulator -= this.tuning.stepMs; this.step(); }
  }
  private step() {
    if (this.state === 'IDLE' || this.state === 'READY' || this.state === 'FINISHED') return;
    const dt = this.tuning.stepMs; this.clockMs += dt; this.tick++; this.inputsThisTick = 0;
    if (this.state === 'PAUSED') {
      if (this.clockMs - this.pausedAt >= this.tuning.abandonAfterMs) this.finish('abandoned');
      return;
    }
    if (this.state === 'COUNTDOWN') {
      const previous = Math.ceil(this.countdownMs / 1000);
      this.countdownMs = Math.max(0, this.countdownMs - dt);
      const seconds = Math.ceil(this.countdownMs / 1000);
      if (seconds && seconds !== previous) this.emit({ type: 'ROUND_COUNTDOWN', phase: 'start', seconds });
      if (!this.countdownMs) { this.state = 'ACTIVE'; this.minimumMessageAt = this.epochMs + this.clockMs; }
      return;
    }
    this.tokens = Math.min(this.tuning.burstCapacity, this.tokens + dt * this.tuning.ratePerSecond / 1000);
    // Resolve windows at this tick's starting active time, so inputs on exact boundaries agree.
    for (const id of ['coral', 'mint'] as const) this.updateCombo(id);
    for (const id of ['coral', 'mint'] as const) {
      const t = this.teams[id]; t.activity = Math.min(this.tuning.maxActivity, t.activity * this.forceDecay + t.pending); t.pending = 0;
      if (t.activity < 1e-8) t.activity = 0;
    }
    const force = this.force('mint') - this.force('coral');
    const acceleration = force * this.tuning.acceleration / this.tuning.mass;
    this.velocity = Math.max(-this.tuning.maxVelocity, Math.min(this.tuning.maxVelocity, (this.velocity + acceleration * dt / 1000) * this.velocityDecay));
    if (Math.abs(this.velocity) < 1e-8) this.velocity = 0;
    this.position = Math.max(-1, Math.min(1, this.position + this.velocity * dt / 1000));
    if (Math.abs(this.position) === 1) {
      this.endpointMs += dt;
      if (Math.sign(this.position) === Math.sign(this.velocity)) this.velocity = 0;
    } else this.endpointMs = 0;
    this.activeMs += dt;
    for (const id of ['coral', 'mint'] as const) if (this.teams[id].level && this.activeMs >= this.teams[id].expires) this.updateCombo(id);
    this.detectMovement();
    if (this.tuning.endpointWins && this.endpointMs >= this.tuning.endpointHoldMs) { this.finish('endpoint'); return; }
    const remaining = this.config.durationSeconds * 1000 - this.activeMs;
    if (remaining <= 0) { this.finish(this.users.size === 0 ? 'no_participation' : Math.abs(this.position) <= this.tuning.tieEpsilon ? 'tie' : 'time'); return; }
    if (remaining <= 5000 && remaining % 1000 === 0) this.emit({ type: 'ROUND_COUNTDOWN', phase: 'final', seconds: remaining / 1000 });
  }
  private updateCombo(id: TeamId) {
    const t = this.teams[id];
    if (t.level && this.activeMs >= t.expires) {
      t.level = 0; t.cooldownUntil = this.activeMs + this.tuning.comboCooldownMs; t.comboUsers.clear();
      this.emit({ type: 'TEAM_COMBO_EXPIRED', team: id });
    }
    for (const [user, at] of t.comboUsers) if (at <= this.activeMs - this.tuning.comboWindowMs) t.comboUsers.delete(user);
    if (this.activeMs < t.cooldownUntil) return;
    let level = 0;
    for (const threshold of COMBO_LEVELS) if (t.comboUsers.size >= threshold.users) level++;
    if (level <= t.level) return;
    const started = t.level === 0;
    if (started) t.expires = this.activeMs + this.tuning.comboDurationMs;
    t.level = level;
    this.emit({ type: started ? 'TEAM_COMBO_STARTED' : 'TEAM_COMBO_UPGRADED', team: id, level, multiplier: COMBO_LEVELS[level - 1]!.multiplier, durationMs: t.expires - this.activeMs });
  }
  private force(id: TeamId) { const t = this.teams[id]; return t.activity * (t.level ? COMBO_LEVELS[t.level - 1]!.multiplier : 1); }
  private detectMovement() {
    if (this.position >= this.tuning.comebackThreshold) this.fellBehind.coral = true;
    if (this.position <= -this.tuning.comebackThreshold) this.fellBehind.mint = true;
    const direction = Math.abs(this.velocity) >= this.tuning.swingVelocity ? Math.sign(this.velocity) : 0;
    if (direction) {
      if (this.lastDirection && this.lastDirection !== direction && this.activeMs - this.swingAt >= this.tuning.swingCooldownMs) {
        this.swingAt = this.activeMs; this.emit({ type: 'MOMENTUM_SWING', team: direction < 0 ? 'coral' : 'mint' });
      }
      this.lastDirection = direction;
    }
    // Hysteresis: crossing the opposite threshold changes the lead, centre jitter does not.
    const next = this.position < -this.tuning.leadThreshold ? 'coral' : this.position > this.tuning.leadThreshold ? 'mint' : this.leader;
    if (next !== this.leader) {
      this.leader = next; this.emit({ type: 'TEAM_LEAD_CHANGED', team: next });
      if (next && this.fellBehind[next] && !this.comebackEmitted[next]) { this.comebackEmitted[next] = true; this.emit({ type: 'COMEBACK_DETECTED', team: next }); }
    }
  }
  private finish(reason: RoundResult['reason']) {
    if (this.state === 'FINISHED') return;
    this.result = { roundId: this.roundId, winner: ['tie', 'no_participation', 'abandoned'].includes(reason) ? null : this.position < 0 ? 'coral' : 'mint', reason, finalPosition: this.position, elapsedMs: this.activeMs, uniqueViewers: this.users.size, contributions: { coral: this.teams.coral.contributions, mint: this.teams.mint.contributions } };
    this.state = 'FINISHED'; this.pauseReason = null; this.velocity = 0;
    this.emit({ type: 'ROUND_FINISHED', result: { ...this.result, contributions: { ...this.result.contributions } } });
  }
  private emit(payload: EventPayload) {
    this.events.push({ ...payload, roundId: this.roundId, sequence: ++this.eventSequence, atMs: this.activeMs } as GameVisualEvent);
    if (this.events.length > 64) this.events.shift();
  }
  snapshot(): GameSnapshot {
    const pressure = (id: TeamId) => {
      const t = this.teams[id];
      return { force: this.force(id), intensity: Math.min(1, this.force(id) / (this.tuning.maxActivity * 1.75)), uniqueViewers: t.viewers, contributions: t.contributions, effectiveContributions: t.effectiveContributions,
        combo: { level: t.level, multiplier: t.level ? COMBO_LEVELS[t.level - 1]!.multiplier : 1, uniqueUsers: t.comboUsers.size, remainingMs: Math.max(0, t.expires - this.activeMs), cooldownMs: Math.max(0, t.cooldownUntil - this.activeMs) } };
    };
    const coral = pressure('coral'), mint = pressure('mint');
    return { version: 1, roundId: this.roundId, state: this.state, source: this.source, config: { ...this.config }, tick: this.tick, stepMs: this.tuning.stepMs,
      clockMs: this.clockMs, elapsedMs: this.activeMs, remainingMs: Math.max(0, this.config.durationSeconds * 1000 - this.activeMs), countdownMs: this.countdownMs,
      position: this.position, overlayPosition: (this.position + 1) / 2, velocity: this.velocity, momentum: this.velocity * this.tuning.mass, direction: Math.sign(this.velocity) as -1 | 0 | 1,
      tension: Math.min(coral.intensity, mint.intensity), leader: this.leader, teams: { coral, mint }, uniqueViewers: this.users.size, pauseReason: this.pauseReason,
      result: this.result && { ...this.result, contributions: { ...this.result.contributions } },
      events: this.events.map(e => e.type === 'ROUND_FINISHED' ? { ...e, result: { ...e.result, contributions: { ...e.result.contributions } } } : { ...e }), lastEventSequence: this.eventSequence,
      inputs: this.inputs.map(i => ({ ...i })), diagnostics: { accepted: this.accepted, rejected: this.rejected, reasons: { ...this.reasons }, trackedUsers: this.users.size, trackedIds: this.ids.size } };
  }
}
