import { DEFAULT_SHOWDOWN, normalizeConfig, type ShowdownConfig, type TeamKeywords, type ConnectionState, type ConnectionIssue, type ConnectionSnapshot, type SimulationProgress, type NormalizedChatMessage, type GameInputEvent, type OverlaySnapshot, type RoundConfig, type GameScenario, type TeamId } from '@chat-tug/contracts';
import type { ServerConfig } from './config.js';
import { EventSubConnection, type SocketFactory } from './eventsub.js';
import { ChatInputPipeline, normalizeTwitchChat } from './pipeline.js';
import { TokenManager, type TwitchGateway } from './twitch-api.js';
import { SimulationRun } from './simulation.js';
import { issueFrom, ServiceError } from './errors.js';
import { secret, type SessionRecord, type SessionRepository } from './sessions.js';
import { GameController } from './game/controller.js';
import { ShowdownLedger } from './game/showdowns.js';
const transitions: Record<ConnectionState, readonly ConnectionState[]> = {
  not_connected: ['authorization_required', 'connecting', 'simulation', 'connection_failed'],
  authorization_required: ['connecting', 'not_connected', 'simulation', 'connection_failed', 'authorization_expired'],
  connecting: ['connected', 'reconnecting', 'authorization_expired', 'connection_failed', 'not_connected', 'simulation', 'authorization_required'],
  connected: ['reconnecting', 'authorization_expired', 'connection_failed', 'not_connected', 'simulation', 'authorization_required'],
  reconnecting: ['connected', 'connecting', 'authorization_expired', 'connection_failed', 'not_connected', 'simulation', 'authorization_required'],
  authorization_expired: ['authorization_required', 'connecting', 'not_connected', 'simulation', 'connection_failed'],
  connection_failed: ['authorization_required', 'connecting', 'not_connected', 'simulation', 'reconnecting', 'authorization_expired'],
  simulation: ['not_connected', 'authorization_required', 'connecting', 'connection_failed'],
};
export function canTransition(from: ConnectionState, to: ConnectionState) { return from === to || transitions[from].includes(to); }
interface Subscriber { send(snapshot: ConnectionSnapshot): void; close(): void; }
export class ArenaRoom {
  readonly game: GameController;
  readonly showdowns = new ShowdownLedger();
  private draft: ShowdownConfig = { ...DEFAULT_SHOWDOWN };
  private configuredShowdown = false;
  private settingsRevision = 0;
  private preparedSequence = 0;
  private preparedAt = 0;
  overlayKey = secret();
  private readonly overlaySubscribers = new Set<{ send(snapshot: OverlaySnapshot): void; close(): void }>();
  private state: ConnectionState;
  private mode: ConnectionSnapshot['mode'] = 'idle';
  private issue: ConnectionIssue | null;
  private notice: ConnectionIssue | null = null;
  private revision = 0;
  private generation = 0;
  private lastEventAt: string | null = null;
  private heartbeat: string | null = null;
  private attempts = 0;
  private evidence: ConnectionSnapshot['evidence'] = { origin: 'none', liveMessageReceivedAt: null, eventId: null };
  delivery: { eventId: string; clientReceivedAt: string } | null = null;
  private simulationProgress: SimulationProgress | null = null;
  private connector?: EventSubConnection;
  private tokens?: TokenManager;
  private simulation?: SimulationRun;
  private simulationNumber = 0;
  private validationTimer?: ReturnType<typeof setInterval>;
  private publicationTimer?: ReturnType<typeof setTimeout>;
  private readonly subscribers = new Set<Subscriber>();
  readonly pipeline: ChatInputPipeline;
  constructor(readonly record: SessionRecord, private readonly repository: SessionRepository, private readonly config: ServerConfig, private readonly api: TwitchGateway, private readonly socketFactory?: SocketFactory) {
    this.state = this.configured ? 'authorization_required' : 'not_connected';
    this.issue = this.configured ? null : 'credentials_missing';
    this.pipeline = new ChatInputPipeline(record.commands, input => this.input(input));
    this.game = new GameController(() => this.publish(), (raw, timestamp) => {
      const message = normalizeTwitchChat(raw, 'simulation-channel', timestamp);
      if (message) this.receive({ ...message, source: 'simulation' });
    });
  }
  get configured() { return Boolean(this.config.clientId && this.config.clientSecret); }
  snapshot(): ConnectionSnapshot {
    const game = this.game.engine.snapshot(); this.showdowns.capture(game, undefined, game.source === 'twitch' ? this.api.origin : 'simulation');
    return { protocolVersion: 2, revision: this.revision, state: this.state, mode: this.mode, channel: this.record.authorization?.channel ?? null, credentialsConfigured: this.configured, authorized: Boolean(this.record.authorization), persistence: this.repository.persistence, issue: this.issue, notice: this.notice, commands: { ...this.record.commands }, inputs: this.pipeline.inputs.map(v => ({ ...v })), counters: { ...this.pipeline.counters }, lastEventAt: this.lastEventAt, lastHeartbeatAt: this.heartbeat, reconnectAttempt: this.attempts, simulation: this.simulationProgress && { ...this.simulationProgress }, evidence: { ...this.evidence }, game,
      showdown: { draft: { ...this.draft }, configured: this.configuredShowdown, settingsRevision: this.settingsRevision, startReady: this.startReady(), current: this.showdowns.current(game.roundId), history: this.showdowns.history() } };
  }
  private set(state: ConnectionState, issue: ConnectionIssue | null = null) {
    if (!canTransition(this.state, state)) throw new Error('Invalid connection state transition');
    this.state = state; this.issue = issue;
    if (this.game.engine.source === 'twitch' && state !== 'connected') this.game.sourceLost();
    this.publish();
  }
  publish(immediate = true) {
    if (!immediate) {
      if (!this.publicationTimer) this.publicationTimer = setTimeout(() => { this.publicationTimer = undefined; this.publish(); }, 100);
      return;
    }
    clearTimeout(this.publicationTimer); this.publicationTimer = undefined; this.revision++;
    const snapshot = this.snapshot(); for (const subscriber of this.subscribers) subscriber.send(snapshot);
    if (this.overlaySubscribers.size) { const overlay = this.overlaySnapshot(); for (const subscriber of this.overlaySubscribers) subscriber.send(overlay); }
  }
  subscribe(send: Subscriber['send'], close: Subscriber['close']) {
    if (this.subscribers.size >= 6) throw new ServiceError('rate_limited', 429);
    const subscriber = { send, close }; this.subscribers.add(subscriber); send(this.snapshot());
    return () => this.subscribers.delete(subscriber);
  }
  overlaySnapshot(): OverlaySnapshot {
    const game = this.game.engine.snapshot(); game.inputs = [];
    this.showdowns.capture(game, undefined, game.source === 'twitch' ? this.api.origin : 'simulation');
    return { version: 1, revision: this.revision, connection: this.state, origin: this.evidence.origin, commands: { ...this.record.commands }, game, consequence: this.showdowns.current(game.roundId) };
  }
  subscribeOverlay(send: (snapshot: OverlaySnapshot) => void, close: () => void) {
    if (this.overlaySubscribers.size >= 6) throw new ServiceError('rate_limited', 429);
    const subscriber = { send, close }; this.overlaySubscribers.add(subscriber); send(this.overlaySnapshot());
    return () => this.overlaySubscribers.delete(subscriber);
  }
  rotateStreams() {
    for (const subscriber of this.subscribers) subscriber.close(); this.subscribers.clear();
    for (const subscriber of this.overlaySubscribers) subscriber.close(); this.overlaySubscribers.clear(); this.overlayKey = secret();
  }
  private input(input: GameInputEvent) {
    this.game.input(input);
    this.lastEventAt = input.occurredAt;
    if (input.source === 'twitch' && this.api.origin === 'twitch' && !this.delivery) this.evidence = { origin: 'twitch', liveMessageReceivedAt: new Date().toISOString(), eventId: input.id };
  }
  acknowledgeInput(eventId: unknown) {
    if (this.state !== 'connected' || this.evidence.origin !== 'twitch' || typeof eventId !== 'string' || eventId !== this.evidence.eventId) return false;
    this.delivery ??= { eventId, clientReceivedAt: new Date().toISOString() }; return true;
  }
  private receive(message: NormalizedChatMessage) {
    if (message.source !== this.mode) return;
    if (this.mode === 'simulation' && this.simulationProgress?.step === 'disconnected') { this.pipeline.counters.ignored++; this.publish(false); return; }
    this.pipeline.ingest(message); this.publish(false);
  }
  private stopTransports() {
    this.generation++; this.connector?.stop(); this.connector = undefined; this.tokens?.close(); this.tokens = undefined;
    this.simulation?.stop(); this.simulation = undefined; clearInterval(this.validationTimer); this.validationTimer = undefined;
  }
  private clearInput() { this.pipeline.reset(); this.lastEventAt = this.heartbeat = null; this.evidence = { origin: 'none', liveMessageReceivedAt: null, eventId: null }; this.delivery = null; this.simulationProgress = null; this.attempts = 0; this.notice = null; }
  authorizationPending() { this.game.sourceChanged(); this.stopTransports(); this.mode = 'idle'; this.clearInput(); this.set('authorization_required', 'authorization_pending'); }
  showNotice(issue: ConnectionIssue) { this.notice = issue; this.publish(); }
  async connect() {
    if (!this.configured) { this.set('not_connected', 'credentials_missing'); return; }
    if (!this.record.authorization) { this.set('authorization_required'); return; }
    if (this.mode !== 'twitch') { this.game.sourceChanged(); this.clearInput(); }
    this.stopTransports(); this.mode = 'twitch'; this.evidence.origin = this.api.origin; this.set('connecting');
    const generation = this.generation;
    const tokens = new TokenManager(this.record, this.api, () => this.repository.save()); this.tokens = tokens;
    try {
      await tokens.validate();
      if (generation !== this.generation) return;
      this.connector = new EventSubConnection(this.record.authorization.channel.id, {
        subscribe: (sessionId, signal) => tokens.execute((token, tokenSignal) => this.api.subscribe(token, this.record.authorization!.channel.id, sessionId, tokenSignal), signal),
        onState: (state, issue, attempt) => { if (generation !== this.generation) return; this.attempts = attempt; this.set(state, issue); },
        onMessage: message => { if (generation === this.generation) this.receive(message); },
        onInvalid: () => { this.pipeline.invalid(); this.publish(false); },
        onDuplicate: () => { this.pipeline.duplicate(); this.publish(false); },
        onHeartbeat: () => { this.heartbeat = new Date().toISOString(); this.publish(false); },
        onRevoked: issue => { if (generation === this.generation) void this.invalidate(issue); },
      }, this.socketFactory);
      this.connector.start();
      this.validationTimer = setInterval(() => { void tokens.validate().catch(error => { if (generation !== this.generation) return; const issue = issueFrom(error); if (['token_invalid', 'permissions_missing'].includes(issue)) void this.invalidate(issue); else this.fail(issue); }); }, 60 * 60_000);
      this.validationTimer.unref?.();
    } catch (error) {
      if (generation !== this.generation) return;
      const issue = issueFrom(error);
      if (['token_invalid', 'permissions_missing'].includes(issue)) await this.invalidate(issue); else this.fail(issue);
    }
  }
  async invalidate(issue: ConnectionIssue) {
    this.stopTransports(); delete this.record.authorization; delete this.record.oauth;
    this.mode = 'idle'; this.evidence = { origin: 'none', liveMessageReceivedAt: null, eventId: null };
    this.delivery = null;
    this.set('authorization_expired', issue);
    try { await this.repository.save(); } catch { this.showNotice('storage_unavailable'); }
  }
  fail(issue: ConnectionIssue) { this.stopTransports(); this.set('connection_failed', issue); }
  startSimulation() {
    this.game.sourceChanged();
    this.stopTransports(); this.clearInput(); this.mode = 'simulation'; this.evidence.origin = 'simulation';
    this.simulationProgress = { running: true, step: 'starting' }; this.set('simulation');
    this.simulation = new SimulationRun(this.record.commands, step => { this.simulationProgress = { running: step !== 'complete', step }; if (step === 'disconnected') this.game.sourceLost(); this.publish(); }, (raw, timestamp) => {
      const message = normalizeTwitchChat(raw, 'simulation-channel', timestamp);
      if (!message) { this.pipeline.invalid(); this.publish(false); return; }
      this.receive({ ...message, source: 'simulation' });
    }, ++this.simulationNumber);
    this.simulation.start();
  }
  stopSimulation() { this.game.sourceChanged(); this.stopTransports(); this.mode = 'idle'; this.simulationProgress = null; this.set('not_connected', 'simulation_stopped'); }
  async setCommands(commands: SessionRecord['commands'], notify = true) {
    if (this.simulationProgress?.running || ['COUNTDOWN', 'ACTIVE', 'PAUSED'].includes(this.game.engine.state)) throw new ServiceError('provider_unavailable', 409);
    const old = this.record.commands; this.record.commands = commands;
    try { await this.repository.save(); } catch (error) { this.record.commands = old; throw error; }
    this.pipeline.commands = commands; this.settingsRevision++; this.preparedSequence = this.pipeline.counters.recognized; this.preparedAt = Date.now(); if (notify) this.publish();
  }
  disconnected(notice: ConnectionIssue | null = null) {
    this.game.sourceChanged();
    this.stopTransports(); this.clearInput(); this.mode = 'idle'; this.notice = notice; this.set('not_connected', 'manual_disconnect');
  }
  canPlay() { return this.state === 'connected' || (this.mode === 'simulation' && this.simulationProgress?.step !== 'disconnected'); }
  prepareGame(config: RoundConfig) {
    if (!this.canPlay()) throw new ServiceError('provider_unavailable', 409);
    this.preparedSequence = this.pipeline.counters.recognized;
    this.preparedAt = Date.now();
    this.game.prepare(config, this.mode === 'twitch' ? 'twitch' : 'simulation', this.mode === 'twitch' ? this.record.authorization!.channel.id : 'simulation-channel');
  }
  startReady() {
    return this.canPlay() && (this.game.engine.config.startCondition !== 'chat_ready' || this.pipeline.inputs.some(input => input.sequence > this.preparedSequence && input.source === this.game.engine.source && Date.parse(input.occurredAt) >= this.preparedAt && Date.parse(input.occurredAt) <= Date.now() + 1000));
  }
  async configureShowdown(config: ShowdownConfig, commands: TeamKeywords) {
    await this.setCommands(commands, false);
    this.draft = normalizeConfig(config) as ShowdownConfig; this.configuredShowdown = true;
    // A saved draft is usable while disconnected. Preparation happens only with a confirmed source.
    if (this.canPlay()) this.prepareGame(this.draft);
    else if (this.game.engine.state === 'READY') this.game.reset();
    this.publish();
  }
  matchesSettings(revision: unknown) { return revision === this.settingsRevision; }
  rehearsal() {
    this.stopTransports(); this.clearInput(); this.mode = 'simulation'; this.evidence.origin = 'simulation';
    this.simulationProgress = { running: false, step: 'complete' }; this.set('simulation');
    this.preparedSequence = 0; this.preparedAt = Date.now(); this.game.rehearse(this.draft, this.record.commands);
  }
  rehearsalCheck() {
    if (this.mode !== 'simulation' || this.game.engine.source !== 'simulation' || this.game.engine.state !== 'READY') throw new ServiceError('provider_unavailable', 409);
    this.game.testPull('coral', 1, 'rehearsal-check', this.record.commands);
  }
  runScenario(scenario: GameScenario, seed: number, config: RoundConfig) {
    this.game.sourceChanged(); this.stopTransports(); this.clearInput(); this.mode = 'simulation'; this.evidence.origin = 'simulation';
    this.simulationProgress = { running: false, step: 'complete' }; this.set('simulation');
    this.game.scenario(scenario, seed, config, this.record.commands);
  }
  testPull(team: TeamId, count: number, viewer: string) {
    if (this.mode !== 'simulation' || this.game.engine.source !== 'simulation' || this.game.engine.state !== 'ACTIVE') throw new ServiceError('provider_unavailable', 409);
    this.game.testPull(team, count, viewer, this.record.commands);
  }
  close() { this.game.close(); this.stopTransports(); clearTimeout(this.publicationTimer); this.mode = 'idle'; this.set('not_connected', 'server_shutdown'); this.rotateStreams(); }
}
