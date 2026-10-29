"use client";
import { useCallback, useRef } from 'react';
import { DEFAULT_KEYWORDS, type GameSnapshot, type OverlaySnapshot, type TeamId } from '@chat-tug/contracts';
import { GameArt } from './game-art';
import { resultCopy, type SceneTimeline } from '@/lib/scene/presentation';
import { previewGame } from '@/lib/scene/preview';

const standby = previewGame();
const clock = (ms: number) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function gameLabel(game: GameSnapshot) {
  if (game.result) return game.result.reason === 'abandoned' ? 'Round abandoned' : game.result.reason === 'no_participation' ? 'No participation' : game.result.winner ? `${game.result.winner === 'coral' ? game.config.coralName : game.config.mintName} wins` : 'Round tied';
  if (game.state === 'PAUSED') return game.pauseReason === 'connection_lost' ? 'Paused · connection interrupted' : 'Paused';
  return game.state === 'COUNTDOWN' ? 'On your marks' : game.state === 'READY' ? 'Ready for the whistle' : 'Pull together';
}
function CrewHud({ game, teamId, command }: { game: GameSnapshot; teamId: TeamId; command: string }) {
  const pressure = game.teams[teamId]; const name = teamId === 'coral' ? game.config.coralName : game.config.mintName;
  const combo = pressure.combo.level > 0 && ['ACTIVE', 'PAUSED'].includes(game.state);
  return <div className={`broadcast-team broadcast-${teamId}`} data-long-name={name.length > 16}>
    <div className="yard-team-heading"><span>Team {teamId === 'coral' ? 'Coral' : 'Mint'}</span><span className="yard-leader">{game.leader === teamId && game.state === 'ACTIVE' ? 'Has the edge' : ''}</span></div>
    {teamId === 'coral' ? <h1>{name}</h1> : <h2>{name}</h2>}
    <div className="yard-command-row"><code>{command}</code><span className="yard-participation"><span className="yard-effort" aria-label={`${teamId} effort`} role="img">{[0.02, 0.07, 0.16, 0.32].map((threshold, i) => <i key={threshold} className={pressure.intensity > threshold ? 'is-filled' : ''} style={{ height: `${(5 + i * 4) / 19.2}cqw` }} />)}</span>{pressure.uniqueViewers} joined</span></div>
    <div className="yard-combo" data-active={combo}><span>{combo ? `Crew combo ×${pressure.combo.multiplier}` : 'Pull as a crew'}</span>{combo && <span>{(pressure.combo.remainingMs / 1000).toFixed(1)}s</span>}</div>
  </div>;
}
export function BroadcastStage({ snapshot, status, preview }: { snapshot: OverlaySnapshot | null; status: 'standby' | 'loading' | 'current' | 'unavailable'; preview: boolean }) {
  const stage = useRef<HTMLElement>(null), notice = useRef<HTMLParagraphElement>(null);
  const game = snapshot?.game ?? standby; const current = status === 'current'; const hasRound = game.state !== 'IDLE';
  const source = snapshot?.origin === 'test_fixture' ? 'Test fixture' : game.source === 'simulation' || snapshot?.origin === 'simulation' ? 'Simulation' : snapshot?.origin === 'twitch' ? 'Twitch' : 'Standby';
  const label = status === 'standby' ? 'Waiting for Twitch' : status === 'loading' ? 'Loading arena' : !current ? 'Arena updates unavailable' : hasRound ? gameLabel(game) : 'Waiting for a round';
  const result = resultCopy(game);
  const consequence = snapshot?.consequence;
  const winningChoice = game.result?.winner ? game.result.winner === 'coral' ? game.config.coralName : game.config.mintName : null;
  const present = useCallback((frame: NonNullable<ReturnType<SceneTimeline['frame']>>) => {
    const element = stage.current; if (!element) return;
    element.dataset.resultReady = String(frame.resultReady);
    element.dataset.notice = frame.cue?.type ?? '';
    if (notice.current) {
      const cue = frame.cue;
      const name = cue?.team === 'coral' ? game.config.coralName : game.config.mintName;
      const value = cue ? cue.type === 'comeback' ? `Comeback: ${name}` : cue.type === 'swing' ? `Momentum: ${name}` : `Lead: ${name}` : '';
      if (notice.current.textContent !== value) notice.current.textContent = value;
    }
    const final = game.state === 'ACTIVE' && game.remainingMs <= 5000;
    const pulse = final ? Math.max(0, 1 - (frame.phaseMs % 1000) / 250) : 0;
    element.style.setProperty('--clock-scale', String(1 + pulse * 0.045));
    element.style.setProperty('--coral-pulse', String(frame.coralPulse)); element.style.setProperty('--mint-pulse', String(frame.mintPulse));
  }, [game]);
  return <main id="main-content" className={`broadcast-root ${preview ? 'broadcast-preview' : ''}`}>
    <div className="broadcast-canvas">
      {preview && <div className="broadcast-preview-label"><span className="status-dot" />{snapshot ? `${source} overlay preview` : 'Overlay preview · Twitch disconnected'}<span>1920 × 1080 source</span></div>}
      <section ref={stage} className="broadcast-field yard-stage authoritative-arena" aria-label={hasRound ? 'Synchronized arena overlay' : 'Disconnected arena overlay'} data-round-id={game.roundId} data-state={game.state} data-connection={current ? 'current' : 'waiting'} data-final-countdown={current && game.state === 'ACTIVE' && game.remainingMs <= 5000}>
        {game.config.template && <div className="yard-question"><span>Chat decides</span><strong>{game.config.title}</strong></div>}
        <div className="broadcast-scoreboard">
          <CrewHud game={game} teamId="coral" command={snapshot?.commands.coral ?? DEFAULT_KEYWORDS.coral} />
          <div className="broadcast-clock">
            <span className="yard-clock-caption">{game.state === 'FINISHED' ? 'Round complete' : 'Chat Tug Arena'}</span>
            {game.result?.winner && <svg className="yard-result-cup" viewBox="0 0 60 60" aria-hidden="true"><use href="/game/fieldday-symbols.svg#knot-cup" /></svg>}
            <strong className="yard-clock-digits">{hasRound && current ? game.state === 'COUNTDOWN' ? Math.ceil(game.countdownMs / 1000) : clock(game.remainingMs) : '--:--'}</strong>
            {game.result && <strong className="yard-result-title" data-long-name={Boolean(winningChoice && winningChoice.length > 10)}>{winningChoice ?? (game.result.reason === 'tie' ? 'A tie' : 'No winner')}</strong>}
            <p role="status">{current && winningChoice ? <><span className="sr-only">{winningChoice} </span>wins!</> : label}</p>
          </div>
          <CrewHud game={game} teamId="mint" command={snapshot?.commands.mint ?? DEFAULT_KEYWORDS.mint} />
        </div>
        <div className="yard-cue-lane"><p ref={notice} className="yard-notice" aria-live="polite" /></div>
        <GameArt game={game} running={current && game.state !== 'PAUSED'} onPresentation={present} />
        <div className="broadcast-instruction" data-consequence={Boolean(consequence)}><span>{consequence ? <span className="yard-consequence-copy"><span>{consequence.summary}</span>{consequence.action && <strong>{consequence.committedAt ? 'Streamer committed: ' : 'Next: '}{consequence.action}</strong>}</span> : game.result ? result.detail : 'Pick a side. Pull together.'}</span><strong>{hasRound ? `${source} round · ${game.uniqueViewers} participants` : snapshot ? `${source} source · Waiting for a round` : 'Preview shell · No live chat connected'}</strong></div>
      </section>
    </div>
  </main>;
}
