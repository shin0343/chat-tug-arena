import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConsequenceCard, ShowdownHistory } from '../../apps/web/src/components/showdown-result';
import type { ShowdownOutcome } from '../../packages/contracts/src/index';
const outcome: ShowdownOutcome = { roundId: 'round-1', question: 'Which character?', winner: 'coral', winningChoice: 'Mage', summary: 'Chat chose Mage for the next match.', action: 'Play as Mage in the next match.', reason: 'manual', source: 'simulation', origin: 'simulation', finishedAt: '2026-10-27T00:00:00.000Z', committedAt: null, participants: 3, effectiveContributions: 3 };
describe('showdown result and history components', () => {
  it('shows the exact action and simulation disclosure; disables commitment without a current control feed', () => {
    const html = renderToStaticMarkup(createElement(ConsequenceCard, { outcome })); expect(html).toContain(outcome.summary); expect(html).toContain(outcome.action); expect(html).toContain('Simulation result'); expect(html).toMatch(/<button[^>]+disabled/); expect(html).toContain('You make the change in your game.');
  });
  it('shows commitment as an intention rather than claiming automatic game control or task completion', () => {
    const html = renderToStaticMarkup(createElement(ConsequenceCard, { outcome: { ...outcome, committedAt: outcome.finishedAt } })); expect(html).toContain('Committed to this choice.'); expect(html).not.toContain('<button'); expect(html).toContain('when you’re ready');
  });
  it('provides a neutral no-play result without an invented winning action', () => {
    const html = renderToStaticMarkup(createElement(ConsequenceCard, { outcome: { ...outcome, winner: null, winningChoice: null, action: null, reason: 'no_participation', summary: 'No pulls this round. No choice was made.' } })); expect(html).toContain('No choice this time.'); expect(html).not.toContain('Your next action'); expect(html).not.toContain('<button');
  });
  it('escapes user text and distinguishes empty, pending and committed history', () => {
    const empty = renderToStaticMarkup(createElement(ShowdownHistory, { history: [] })); expect(empty).toContain('Your first decision goes here.');
    const html = renderToStaticMarkup(createElement(ShowdownHistory, { history: [{ ...outcome, question: '<script>alert(1)</script>' }, { ...outcome, roundId: 'r2', committedAt: outcome.finishedAt }] })); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>'); expect(html).toContain('Awaiting commitment'); expect(html).toContain('Committed');
  });
});
