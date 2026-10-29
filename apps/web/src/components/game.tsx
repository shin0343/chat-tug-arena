"use client";
import { useState } from 'react';
import { GAME_SCENARIOS, type GameSnapshot, type GameScenario, type TeamId, type TeamKeywords, type RoundState, type RoundConfig } from '@chat-tug/contracts';
import { useConnection, ConnectionError, type GameAction } from '@/lib/connection-store';
import { useRoundConfig } from '@/lib/config-store';
import { TugScene } from './arena';
import { Button, ButtonLink, Panel, StatusBadge } from './ui';
import { GameArt } from './scene/game-art';
import { ConfirmRoundAction } from './confirm-round-action';

export const scenarioLabels: Record<GameScenario, string> = { balanced: 'Balanced match', early_blowout: 'Early blowout', late_comeback: 'Late comeback', combo_rush: 'Team combo rush', spam_attempt: 'Spam attempt', quiet: 'Quiet match', connection_interruption: 'Connection interruption' };
export function clock(ms: number) { const seconds = Math.ceil(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
// Tuning scenarios use saved physics/choice settings, without creating a streamer commitment.
function labSettings(config: RoundConfig): RoundConfig { const { title, coralName, mintName, durationSeconds, cooldownSeconds } = config; return { title, coralName, mintName, durationSeconds, cooldownSeconds }; }
export function gameStatus(game: GameSnapshot): string {
  if (game.result) return game.result.reason === 'abandoned' ? 'Round abandoned' : game.result.reason === 'no_participation' ? 'No participation' : game.result.winner ? `${game.result.winner === 'coral' ? game.config.coralName : game.config.mintName} wins` : 'Round tied';
  if (game.state === 'PAUSED') return game.pauseReason === 'connection_lost' ? 'Paused · connection interrupted' : game.pauseReason === 'server_lag' ? 'Paused · server delay' : 'Paused';
  return { IDLE: 'Waiting for a round', READY: 'Ready to start', COUNTDOWN: 'Get ready', ACTIVE: 'Pull together', PAUSED: 'Paused', FINISHED: 'Round finished' }[game.state];
}
/** Interpolation affects this drawing only. It never changes the authoritative state or winner. */
export function GameScene({ game, transparent = false }: { game: GameSnapshot; transparent?: boolean }) {
  const { feed } = useConnection();
  return <GameArt game={game} running={feed === 'live' && game.state !== 'PAUSED'} compact={!transparent} />;
}
export function GameArena({ game, commands }: { game: GameSnapshot; commands: TeamKeywords }) {
  const { feed, snapshot } = useConnection();
  return <div className="arena authoritative-arena" data-state={game.state}>
    <div className="arena-topline"><span className="arena-brand">The tug yard</span><StatusBadge tone={snapshot?.evidence.origin === 'test_fixture' ? 'warning' : game.source === 'simulation' ? 'demo' : 'neutral'}>{snapshot?.evidence.origin === 'test_fixture' ? 'Test fixture round' : game.source === 'simulation' ? 'Simulation round' : 'Twitch round'}</StatusBadge></div>
    <div className="scoreboard">
      <div className="team-name team-coral"><span className="team-label">Team Coral</span><strong>{game.config.coralName}</strong><code>{commands.coral}</code></div>
      <div className="game-clock"><span>{game.state === 'COUNTDOWN' ? 'Get ready' : 'Time left'}</span><strong data-testid="match-clock">{feed !== 'live' ? '--:--' : game.state === 'COUNTDOWN' ? Math.ceil(game.countdownMs / 1000) : clock(game.remainingMs)}</strong></div>
      <div className="team-name team-mint"><span className="team-label">Team Mint</span><strong>{game.config.mintName}</strong><code>{commands.mint}</code></div>
    </div>
    <GameScene game={game} />
    <div className="game-state-line"><strong role="status">{gameStatus(game)}</strong><span>{game.uniqueViewers} unique participants</span></div>
  </div>;
}
export function actionError(error: unknown) {
  const copy: Record<string, string> = { round_conflict: 'The round changed. Check its current state and try again.', connection_required: 'Restore the Twitch connection before continuing.', consequence_pending: 'Commit to the winning choice before starting another showdown.', settings_conflict: 'Settings changed in another tab. Load the saved settings, then review your changes.', chat_check_required: 'Send either team command after preparing the showdown, then start.', rate_limited: 'Too many actions. Wait a minute, then try again.' };
  return error instanceof ConnectionError && copy[error.code] ? copy[error.code]! : 'The action could not be confirmed. Check the current round and connection before trying again.';
}
export function RoundControls({ workflow = false }: { workflow?: boolean }) {
  const { snapshot, feed, busy, action } = useConnection(); const { config: localConfig } = useRoundConfig();
  const config = snapshot?.showdown?.configured ? labSettings(snapshot.showdown.draft) : localConfig;
  const [error, setError] = useState(''); const [feedback, setFeedback] = useState<{ text: string; roundId: string; state: RoundState } | null>(null);
  const [confirmation, setConfirmation] = useState<{ name: 'finish' | 'abandon' | 'reset'; roundId: string; state: RoundState } | null>(null);
  const game = snapshot?.game;
  if (!game) return <p className="control-help">Waiting for game updates.</p>;
  const available = feed === 'live' && !busy;
  const connected = snapshot.state === 'connected' || (snapshot.mode === 'simulation' && snapshot.simulation?.step !== 'disconnected');
  const pending = Boolean(snapshot?.showdown?.current?.winner && !snapshot.showdown.current.committedAt);
  async function run(name: GameAction, expected = game ? { roundId: game.roundId, expectedState: game.state } : null) {
    if (!game) return;
    setError(''); setFeedback(null); try {
      const confirmed = await action(`game/${name}`, { ...expected, config: workflow ? snapshot?.showdown?.draft ?? config : config });
      const messages: Partial<Record<GameAction, string>> = { prepare: 'Showdown prepared. Review the choices, then start.', start: 'Round started. The countdown is running.', pause: 'Round paused. Time and the rope are frozen.', resume: 'Round resumed.', finish: 'Result finalized by the server.', abandon: 'Round cancelled. No choice was made.', reset: 'Arena reset. Saved settings and history are kept.', rematch: 'Rematch confirmed by the server.', rehearse: 'Rehearsal prepared. Automated pulls will start after the countdown.', 'rehearsal-check': 'Rehearsal command received. You can start now.' };
      if (confirmed.snapshot.game) setFeedback({ text: messages[name] ?? 'Action confirmed.', roundId: confirmed.snapshot.game.roundId, state: confirmed.snapshot.game.state }); setConfirmation(null);
    } catch (e) { setError(actionError(e)); setConfirmation(null); }
  }
  function request(name: 'finish' | 'abandon' | 'reset') { if (workflow) setConfirmation({ name, roundId: game!.roundId, state: game!.state }); else void run(name); }
  const words = workflow ? 'showdown' : 'round';
  const configured = !workflow || snapshot?.showdown?.configured;
  return <div className="round-controls" aria-label="Round controls" aria-busy={busy}>
    <p className="round-state-label">{gameStatus(game)}</p>
    <div className="game-actions">
      {!configured && <ButtonLink href="/dashboard/round">Create a showdown</ButtonLink>}
      {game.state === 'IDLE' && configured && <Button disabled={!available || !connected} onClick={() => void run('prepare')}>Prepare {words}</Button>}
      {game.state === 'READY' && <Button disabled={!available || !connected || (workflow && !snapshot?.showdown?.startReady)} onClick={() => void run('start')}>Start {words}</Button>}
      {['ACTIVE', 'COUNTDOWN'].includes(game.state) && <Button variant={workflow ? 'primary' : 'secondary'} disabled={!available} onClick={() => void run('pause')}>Pause round</Button>}
      {game.state === 'PAUSED' && <Button disabled={!available || !connected} onClick={() => void run('resume')}>Resume round</Button>}
      {workflow && (game.state === 'ACTIVE' || (game.state === 'PAUSED' && !game.countdownMs)) && <Button variant="secondary" disabled={!available} onClick={() => request('finish')}>Finish now</Button>}
      {['ACTIVE', 'COUNTDOWN', 'PAUSED', 'READY'].includes(game.state) && <Button variant="quiet" disabled={!available} onClick={() => request('abandon')}>{workflow ? 'Cancel showdown' : 'Abandon round'}</Button>}
      {game.state === 'FINISHED' && <><Button disabled={!available || !connected || pending} onClick={() => void run(workflow && game.source === 'simulation' && game.config.template ? 'rehearse' : 'rematch')}>Rematch</Button><Button variant="secondary" disabled={!available || pending} onClick={() => request('reset')}>Reset round</Button></>}
    </div>
    {!connected && <p className="control-help">{workflow ? 'Connect Twitch to start, or rehearse below with clearly labeled simulated pulls.' : 'Connect Twitch or run a scenario in Mechanics lab to prepare a round.'}</p>}
    {pending && <p className="control-help">{workflow ? 'Commit to the winning choice above to unlock the next round.' : 'Commit to the winning choice in the control room to unlock the next round.'}{!workflow && <ButtonLink href="/dashboard" variant="quiet">Open control room</ButtonLink>}</p>}
    {workflow && game.state === 'READY' && connected && !snapshot?.showdown?.startReady && <p className="control-help">Send {snapshot?.commands.coral} or {snapshot?.commands.mint} once to check chat, then start.</p>}
    {workflow && game.state === 'READY' && game.source === 'simulation' && !snapshot?.showdown?.startReady && <Button variant="secondary" disabled={!available} onClick={() => void run('rehearsal-check')}>Send rehearsal check</Button>}
    {game.state === 'PAUSED' && <p className="control-help">The clock and rope are frozen. Resume within 60 seconds; otherwise the round is abandoned.</p>}
    {game.state === 'READY' && <p className="control-help">Round settings are now held by the server. Start opens a three-second countdown.</p>}
    {error && <p className="inline-message error" role="alert">{error}</p>}
    {feedback && feedback.roundId === game.roundId && feedback.state === game.state && <p className="inline-message success action-feedback" role="status">{feedback.text}</p>}
    {workflow && <ConfirmRoundAction open={Boolean(confirmation && confirmation.roundId === game.roundId && confirmation.state === game.state)} busy={busy} title={confirmation?.name === 'finish' ? 'Finish at the current position?' : confirmation?.name === 'reset' ? 'Reset the arena?' : 'Cancel this showdown?'} description={confirmation?.name === 'finish' ? 'The server will lock the result using the rope’s current position. A tied rope stays a tie.' : confirmation?.name === 'reset' ? 'Return the field to idle. Saved showdown settings and history are kept.' : 'End this round without choosing a winner. You can prepare another showdown afterward.'} confirmLabel={confirmation?.name === 'finish' ? 'Finalize result' : confirmation?.name === 'reset' ? 'Reset arena' : 'Cancel showdown'} onCancel={() => setConfirmation(null)} onConfirm={() => { if (confirmation) void run(confirmation.name, { roundId: confirmation.roundId, expectedState: confirmation.state }); }} />}
  </div>;
}
export function MechanicsLab() {
  const { snapshot, feed, busy, action } = useConnection(); const { config: localConfig } = useRoundConfig();
  const config = snapshot?.showdown?.configured ? labSettings(snapshot.showdown.draft) : localConfig;
  const [scenario, setScenario] = useState<GameScenario>('quiet'); const [seed, setSeed] = useState('42');
  const [viewer, setViewer] = useState('test-viewer'); const [count, setCount] = useState('1'); const [error, setError] = useState('');
  const game = snapshot?.game;
  const run = async (name: 'simulate' | 'test-input', payload: object) => {
    if (!game) return;
    setError(''); try { await action(`game/${name}`, { roundId: game.roundId, expectedState: game.state, ...payload }); } catch (e) { setError(actionError(e)); }
  };
  const canRun = Boolean(game && ['IDLE', 'READY', 'FINISHED'].includes(game.state) && feed === 'live' && !busy);
  const canPull = game?.source === 'simulation' && game.state === 'ACTIVE' && feed === 'live' && !busy;
  return <>
    <p className="inline-message simulation-disclosure">Developer tuning view. Scenarios and test pulls are simulated inputs. Twitch is stopped when a scenario starts.</p>
    <div className="mechanics-layout">
      <div className="mechanics-primary">
        <Panel title="Authoritative arena" action={<span className="quiet-label">50 Hz physics · 10 Hz updates</span>}>
          {game && game.source !== 'idle' ? <GameArena game={game} commands={snapshot!.commands} /> : <div className="mechanics-empty"><TugScene compact /><p>Select a scenario, then run a simulated round.</p></div>}
          <div className="game-readouts">
            <div><span>Rope position</span><strong data-testid="rope-position">{(game?.position ?? 0).toFixed(4)}</strong></div>
            <div><span>Velocity / second</span><strong data-testid="rope-velocity">{(game?.velocity ?? 0).toFixed(4)}</strong></div>
            <div><span>Momentum</span><strong>{(game?.momentum ?? 0).toFixed(4)}</strong></div>
            <div><span>Simulation tick</span><strong>{game?.tick ?? 0}</strong></div>
          </div>
        </Panel>
        {game && <Panel title="Crew pressure"><div className="pressure-grid">{(['coral', 'mint'] as const).map(team => <div className={`pressure-team pressure-${team}`} key={team}>
          <h3>{team === 'coral' ? game.config.coralName : game.config.mintName}</h3>
          <meter min="0" max="1" value={game.teams[team].intensity} aria-label={`${team} intensity`} />
          <dl><div><dt>Force</dt><dd data-testid={`${team}-force`}>{game.teams[team].force.toFixed(3)}</dd></div><div><dt>Distinct viewers</dt><dd>{game.teams[team].uniqueViewers}</dd></div><div><dt>Applied pulls</dt><dd>{game.teams[team].contributions}</dd></div><div><dt>Combo</dt><dd data-testid={`${team}-combo`}>{game.teams[team].combo.level ? `Level ${game.teams[team].combo.level} · ×${game.teams[team].combo.multiplier}` : game.teams[team].combo.cooldownMs ? 'Cooling down' : 'Inactive'}</dd></div><div><dt>Combo time</dt><dd>{(game.teams[team].combo.remainingMs / 1000).toFixed(1)}s</dd></div></dl>
        </div>)}</div></Panel>}
        <Panel title="Input decisions" action={<span className="quiet-label">Newest 40 · rejected rows sampled</span>}>
          <p className="mechanics-summary">{game?.diagnostics.accepted ?? 0} applied · {game?.diagnostics.rejected ?? 0} rejected · {snapshot?.counters.duplicates ?? 0} duplicate messages filtered upstream</p>
          {!game?.inputs.length ? <p className="mechanics-summary">No game inputs yet. Test pulls become available after the countdown.</p> : <ol className="mechanics-inputs" aria-label="Game input decisions">{game.inputs.slice(0, 12).map(input => <li key={input.sequence}><span className={`decision-team ${input.team}`}>{input.team}</span><span>{input.viewer}</span><strong>{input.accepted ? `Applied ×${input.weight}` : input.reason?.replaceAll('_', ' ')}</strong><time>{(input.atMs / 1000).toFixed(1)}s</time></li>)}</ol>}
        </Panel>
        <Panel title="Visual event contract"><ol className="mechanics-events" aria-label="Visual events">{game?.events.slice(-10).reverse().map(event => <li key={event.sequence}><span>{event.type.replaceAll('_', ' ').toLowerCase()}</span><span>{'team' in event ? event.team : event.type === 'ROUND_COUNTDOWN' ? `${event.phase} · ${event.seconds}` : event.type === 'ROUND_FINISHED' ? event.result.reason : ''}</span><time>{(event.atMs / 1000).toFixed(2)}s</time></li>)}</ol><p className="control-help mechanics-summary">Event sequence and round ID let Phase 4 play each reaction once. Drawing interpolation never changes these results.</p></Panel>
      </div>
      <aside className="mechanics-rail">
        <Panel title="Seeded scenarios"><form className="mechanics-form" onSubmit={event => { event.preventDefault(); void run('simulate', { scenario, seed: Number(seed), config }); }}>
          <label htmlFor="scenario">Scenario</label><select id="scenario" value={scenario} onChange={e => setScenario(e.target.value as GameScenario)}>{GAME_SCENARIOS.map(s => <option key={s} value={s}>{scenarioLabels[s]}</option>)}</select>
          <label htmlFor="scenario-seed">Seed</label><input id="scenario-seed" type="number" min="0" max="4294967295" step="1" required value={seed} onChange={e => setSeed(e.target.value)} />
          <p className="control-help">Uses saved round settings: {config.durationSeconds}s, {config.cooldownSeconds}s cooldown. Default measurements use 45s and 2s.</p>
          <Button disabled={!canRun}>Run scenario</Button><p className="control-help">Abandon the current round before running another scenario.</p>
        </form></Panel>
        <Panel title="Round lifecycle"><RoundControls /></Panel>
        <Panel title="Test contributions"><div className="mechanics-form">
          <label htmlFor="test-viewer">Viewer identity</label><input id="test-viewer" pattern="[a-zA-Z0-9_-]{1,32}" maxLength={32} value={viewer} onChange={e => setViewer(e.target.value)} aria-describedby="test-viewer-help" />
          <p className="control-help" id="test-viewer-help">Reuse an identity to test cooldown and team locking. Change it to add a distinct viewer.</p>
          <label htmlFor="test-count">Participants per pull</label><select id="test-count" value={count} onChange={e => setCount(e.target.value)}><option value="1">1 viewer</option><option value="3">3 viewers</option><option value="6">6 viewers</option><option value="10">10 viewers</option></select>
          <div className="test-pull-actions">{(['coral', 'mint'] as TeamId[]).map(team => <Button key={team} variant={team} disabled={!canPull || !/^[a-zA-Z0-9_-]{1,32}$/.test(viewer)} onClick={() => void run('test-input', { team, count: Number(count), viewer })}>Pull for {team === 'coral' ? 'Coral' : 'Mint'}</Button>)}</div>
          <p className="control-help">Available only during an active simulation round.</p>
        </div></Panel>
        {error && <p className="inline-message error" role="alert">{error}</p>}
      </aside>
    </div>
  </>;
}
