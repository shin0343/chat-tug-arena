import type { GameSnapshot, ShowdownOutcome } from '@chat-tug/contracts';
import { Button, StatusBadge } from './ui';

export function ConsequenceCard({ outcome, canCommit = false, busy = false, onCommit }: { outcome: ShowdownOutcome; canCommit?: boolean; busy?: boolean; onCommit?: () => void }) {
  return <section className={`consequence-card consequence-${outcome.winner ?? 'neutral'}`} aria-labelledby="consequence-heading">
    <div className="consequence-heading"><span className="consequence-label">{outcome.winner ? 'Winning choice' : 'No choice this time.'}</span><StatusBadge tone={outcome.origin === 'test_fixture' ? 'warning' : outcome.source === 'simulation' ? 'demo' : 'neutral'}>{outcome.origin === 'test_fixture' ? 'Test fixture result' : outcome.source === 'simulation' ? 'Simulation result' : 'Twitch result'}</StatusBadge></div>
    <h2 id="consequence-heading" className="consequence-summary">{outcome.summary}</h2>
    {outcome.action && <div className="consequence-action"><span>Your next action</span><strong>{outcome.action}</strong></div>}
    {outcome.winner && (outcome.committedAt ? <p className="commit-status" role="status">Committed to this choice. Take the action in your game when you’re ready.</p> : <div className="commit-row"><Button disabled={!canCommit || busy} onClick={onCommit}>Commit to this choice</Button><p>This records your commitment. You make the change in your game.</p></div>)}
    {!outcome.winner && <p className="control-help">Rematch or change the choices. No action is required.</p>}
  </section>;
}
export function LiveInsights({ game }: { game: GameSnapshot }) {
  return <section className="live-insights" aria-label="Live participation">
    <div className="participation-total"><strong>{game.uniqueViewers}</strong><span>unique participants</span></div>
    <div className="crew-insights">{(['coral', 'mint'] as const).map(team => {
      const crew = game.teams[team];
      const combo = crew.combo.level > 0 && ['ACTIVE', 'PAUSED'].includes(game.state);
      return <div key={team} className={`crew-insight crew-insight-${team}`}>
        <h3>{team === 'coral' ? game.config.coralName : game.config.mintName}</h3>
        <dl><div><dt>Participants</dt><dd>{crew.uniqueViewers}</dd></div><div><dt>{crew.effectiveContributions === undefined ? 'Accepted pulls' : 'Effective pulls'}</dt><dd>{(crew.effectiveContributions ?? crew.contributions).toFixed(1)}</dd></div><div className="insight-combo" data-active={combo}><dt>Combo</dt><dd>{combo ? `×${crew.combo.multiplier}` : game.state === 'FINISHED' ? 'Ended' : 'None'}</dd></div></dl>
      </div>;
    })}</div><p className="control-help">Effective pulls include repeat-player diminishing returns. Combo multipliers act on rope pressure.</p>
  </section>;
}
export function ShowdownHistory({ history, compact = false }: { history: ShowdownOutcome[]; compact?: boolean }) {
  if (!history.length) return <div className="showdown-history-empty"><h3>Your first decision goes here.</h3><p>Finish a showdown to keep its choice and your commitment in this session.</p></div>;
  return <ol className="showdown-history" aria-label="Showdown history">{history.slice(0, compact ? 3 : 20).map(outcome => <li key={outcome.roundId}>
    <div><h3>{outcome.question}</h3><p>{outcome.summary}</p>{outcome.action && <p className="history-action">{outcome.action}</p>}<span className="history-meta">{outcome.origin === 'test_fixture' ? 'Test fixture' : outcome.source === 'simulation' ? 'Simulation' : 'Twitch'} · {outcome.participants} participants</span></div>
    <StatusBadge tone={outcome.winner ? outcome.committedAt ? 'success' : 'warning' : 'neutral'}>{outcome.winner ? outcome.committedAt ? 'Committed' : 'Awaiting commitment' : outcome.reason === 'abandoned' ? 'Cancelled' : outcome.reason === 'no_participation' ? 'No participation' : 'Tied'}</StatusBadge>
  </li>)}</ol>;
}
