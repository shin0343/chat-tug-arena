"use client";
import { useState } from 'react';
import { DEFAULT_SHOWDOWN } from '@chat-tug/contracts';
import { Arena } from '@/components/arena';
import { PageHeading } from '@/components/app-shell';
import { Button, ButtonLink, Panel, StatusBadge } from '@/components/ui';
import { GameArena, RoundControls, actionError, gameStatus } from '@/components/game';
import { ChatActivity } from '@/components/connection';
import { ConsequenceCard, LiveInsights, ShowdownHistory } from '@/components/showdown-result';
import { OverlaySetup } from '@/components/overlay-setup';
import { useConnection } from '@/lib/connection-store';
import { stateCopy } from '@/lib/connection-copy';

export default function Dashboard() {
  const { snapshot, feed, busy, action, retry } = useConnection();
  const [error, setError] = useState('');
  const game = snapshot?.game, showdown = snapshot?.showdown;
  const config = game && game.state !== 'IDLE' ? game.config : showdown?.draft ?? DEFAULT_SHOWDOWN;
  const outcome = showdown?.current;
  const connected = feed === 'live' && snapshot?.state === 'connected';
  const pending = Boolean(outcome?.winner && !outcome.committedAt);
  async function commit() {
    if (!game) return;
    setError(''); try { await action('game/commit', { roundId: game.roundId, expectedState: game.state }); } catch (error) { setError(actionError(error)); }
  }
  async function rehearse() {
    if (!game) return;
    setError(''); try { await action('game/rehearse', { roundId: game.roundId, expectedState: game.state }); } catch (error) { setError(actionError(error)); }
  }
  return <div className={game && !['IDLE', 'READY'].includes(game.state) ? 'showdown-workflow showdown-is-running' : 'showdown-workflow'}>
    <PageHeading title={game?.state === 'FINISHED' ? 'Round result' : 'Control room'} description={game?.state === 'FINISHED' ? 'Review the result before your next showdown.' : 'Your current question, game and next action.'}><ButtonLink href="/dashboard/round" variant="secondary">Showdown settings</ButtonLink></PageHeading>
    {snapshot?.evidence.origin === 'test_fixture' && <p className="inline-message warning" role="status">Test provider — this workspace uses automated fixtures. It is not evidence of real Twitch connectivity.</p>}
    <div className={`connection-notice showdown-connection ${connected ? 'connection-confirmed' : ''}`} data-updates={feed}>
      <div><strong>{feed === 'loading' ? 'Checking your connection updates.' : feed !== 'live' ? 'Control room updates are unavailable.' : connected ? `Connected to ${snapshot?.channel?.displayName}` : snapshot?.mode === 'simulation' ? 'Simulation mode — Twitch is not receiving pulls.' : snapshot ? stateCopy[snapshot.state].title : 'Connect your Twitch channel.'}</strong>
        <p>{feed !== 'live' ? 'Controls stay unavailable until current server updates return.' : connected ? 'Chat commands reach this arena. Starting is always your call.' : snapshot?.mode === 'simulation' ? 'This rehearsal uses simulated viewers. Connect Twitch before using real chat.' : 'Connect your channel, or save a showdown and try a labeled rehearsal.'}</p></div>
      {feed !== 'live' && feed !== 'loading' ? <Button variant="secondary" onClick={retry}>Retry updates</Button> : <ButtonLink href="/dashboard/connection" variant="secondary">{connected ? 'View connection' : 'Connect Twitch'}</ButtonLink>}
    </div>
    <div className="dashboard-grid showdown-dashboard">
      <div className="dashboard-primary">
        <Panel title="Current showdown" action={<StatusBadge tone={game?.state === 'PAUSED' ? 'warning' : 'neutral'}>{game && game.state !== 'IDLE' ? game.state === 'FINISHED' ? 'Finished' : gameStatus(game) : showdown?.configured ? 'Saved' : 'Not set up'}</StatusBadge>}>
          <div className="showdown-question"><h2>{config.title}</h2><p>{showdown?.configured || game?.state !== 'IDLE' ? 'Two choices. One decision from chat.' : 'Start with this matchup or make it your own in Showdown settings.'}</p></div>
          {outcome && <ConsequenceCard outcome={outcome} canCommit={feed === 'live'} busy={busy} onCommit={() => void commit()} />}
          <RoundControls workflow />
          {game && game.state !== 'IDLE' ? <GameArena game={game} commands={snapshot!.commands} /> : <Arena config={config} commands={snapshot?.commands} compact />}
        </Panel>
        {error && <p className="inline-message error" role="alert">{error}</p>}
        {game && game.state !== 'IDLE' && <Panel title="Live participation"><LiveInsights game={game} /></Panel>}
        <Panel title="Recent showdowns" action={<ButtonLink href="/dashboard/history" variant="quiet">View history</ButtonLink>}>
          {feed === 'loading' ? <p className="mechanics-summary">Loading your session.</p> : <ShowdownHistory history={showdown?.history ?? []} compact />}
        </Panel>
        <details className="activity-details"><summary>Recent recognized commands</summary><ChatActivity /></details>
      </div>
      <aside className="dashboard-rail">
        <Panel title="Choices and rules"><div className="showdown-rules">
          <div className="saved-choice saved-coral"><span>Coral choice</span><strong>{config.coralName}</strong><code>{snapshot?.commands.coral ?? '!coral'}</code></div>
          <div className="saved-choice saved-mint"><span>Mint choice</span><strong>{config.mintName}</strong><code>{snapshot?.commands.mint ?? '!mint'}</code></div>
          <dl><div><dt>Round length</dt><dd>{config.durationSeconds}s</dd></div><div><dt>Viewer cooldown</dt><dd>{config.cooldownSeconds}s</dd></div><div><dt>Start check</dt><dd>{config.startCondition === 'chat_ready' ? 'Fresh command' : 'Connection ready'}</dd></div></dl>
          <ButtonLink href="/dashboard/round" variant="secondary">{['COUNTDOWN', 'ACTIVE', 'PAUSED'].includes(game?.state ?? '') || pending ? 'View settings' : 'Edit showdown'}</ButtonLink>
        </div></Panel>
        <Panel title="On your stream"><OverlaySetup compact /></Panel>
        {!connected && game && ['IDLE', 'READY', 'FINISHED'].includes(game.state) && <Panel title="Try it before going live"><div className="rehearsal-panel"><p>Rehearse your saved choices with simulated viewers and an automatic Coral rush.</p><Button variant="secondary" disabled={!showdown?.configured || feed !== 'live' || busy || pending} onClick={() => void rehearse()}>Rehearse this showdown</Button><p className="control-help">{showdown?.configured ? 'The rehearsal stays labeled Simulation on the dashboard and overlay.' : 'Save your showdown first. No Twitch credentials are needed for rehearsal.'}</p></div></Panel>}
      </aside>
    </div>
  </div>;
}
