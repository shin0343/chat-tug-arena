"use client";
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { GameSnapshot, TeamId } from '@chat-tug/contracts';
import { SceneTimeline, SCENE, crewCount } from '@/lib/scene/presentation';
import { sampleRig, segment, shirt, type RigPose } from '@/lib/scene/rig';

const atlas = '/game/fieldday-symbols.svg';
const teams = ['coral', 'mint'] as const;
const point = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
function paths(pose: RigPose) {
  return {
    legA: segment(pose.hip, pose.leftKnee, pose.leftFoot), legB: segment({ x: pose.hip.x + 6, y: pose.hip.y }, pose.rightKnee, pose.rightFoot),
    armA: segment(pose.shoulder, pose.leftElbow, pose.leftHand), armB: segment({ x: pose.shoulder.x + 8, y: pose.shoulder.y + 3 }, pose.rightElbow, pose.rightHand),
    shirt: shirt(pose), neck: `M${point(pose.shoulder.x, pose.shoulder.y)}L${point(pose.head.x, pose.head.y + 12)}`,
    stripe: `M${point(pose.shoulder.x - 13, pose.shoulder.y + 8)}L${point(pose.shoulder.x + 14, pose.shoulder.y + 8)}`,
  };
}
function CrewFigure({ team, slot }: { team: TeamId; slot: number }) {
  const base = team === 'coral' ? 620 - slot * 90 : 980 + slot * 90;
  const initial = sampleRig('idle', 0, 0, team === 'coral' ? base : 1600 - base, 0, slot, true);
  const d = paths(initial);
  return <g className={`yard-crew yard-${team}`} data-team={team} data-slot={slot} data-animation="idle" transform={`translate(${base} 0) ${team === 'mint' ? 'scale(-1 1)' : ''}`}>
    <ellipse data-part="shadow" cx="0" cy="226" rx="37" ry="5" fill="var(--text-primary)" opacity=".12" />
    <g stroke="var(--text-primary)" strokeLinecap="round" strokeLinejoin="round">
      <path data-part="legA" d={d.legA} fill="none" strokeWidth="13" /><path data-part="legB" d={d.legB} fill="none" strokeWidth="13" />
      <g data-part="bootA" transform={`translate(${point(initial.leftFoot.x, initial.leftFoot.y - 3)})`}><use href={`${atlas}#boot`} x="-16" y="-10" width="40" height="14" /></g>
      <g data-part="bootB" transform={`translate(${point(initial.rightFoot.x, initial.rightFoot.y - 3)})`}><use href={`${atlas}#boot`} x="-16" y="-10" width="40" height="14" /></g>
      <path data-part="armA" d={d.armA} fill="none" strokeWidth="13" />
      <path data-part="neck" d={d.neck} strokeWidth="16" /><path data-part="neckFill" d={d.neck} stroke="var(--paper)" strokeWidth="10" />
      <path data-part="shirt" d={d.shirt} fill="var(--crew-fill)" strokeWidth="3" />
      <path data-part="stripe" d={d.stripe} stroke="var(--paper)" strokeWidth="5" />
      <text data-part="number" x="-3" y="151" fill="var(--text-primary)" stroke="none" fontFamily="var(--font-display)" fontSize="19" fontWeight="700" textAnchor="middle" transform={team === 'mint' ? 'scale(-1 1)' : undefined}>{slot + 1}</text>
      <g data-part="head" transform={`translate(${point(initial.head.x, initial.head.y)}) rotate(-8)`}>
        <use href={`${atlas}#${['head-band', 'head-curl', 'head-cap'][slot % 3]}`} x="-25" y="-27" width="50" height="54" />
        <path data-part="mouth" d={initial.mouth} fill="none" strokeWidth="2" />
      </g>
      <path data-part="armB" d={d.armB} fill="none" strokeWidth="13" /><path data-part="sleeve" d={d.armB} fill="none" stroke="var(--crew-fill)" strokeWidth="7" />
    </g>
    <g data-part="effort" opacity="0" fill="none" stroke="var(--crew-ink)" strokeWidth="2.5" strokeLinecap="round"><path d="M-39 105l-6-3m9-6-2-6m-7 24h-8" /></g>
  </g>;
}
interface FigureCache { element: SVGGElement; team: TeamId; slot: number; base: number; parts: Record<string, SVGElement>; }
const set = (element: Element | undefined, name: string, value: string | number | boolean) => element?.setAttribute(name, String(value));

/** One bounded SVG renderer. React handles snapshots/roster; a single RAF writes connected joint paths. */
export function GameArt({ game, running = true, compact = false, onPresentation }: { game: GameSnapshot; running?: boolean; compact?: boolean; onPresentation?: (frame: NonNullable<ReturnType<SceneTimeline['frame']>>) => void }) {
  const svg = useRef<SVGSVGElement>(null); const timeline = useRef(new SceneTimeline());
  const current = useRef({ game, running, onPresentation }); const wake = useRef<(() => void) | null>(null);
  const coral = crewCount(game.teams.coral.uniqueViewers), mint = crewCount(game.teams.mint.uniqueViewers);
  const id = useId().replaceAll(':', '');
  useLayoutEffect(() => {
    const resume = running && !current.current.running;
    current.current = { game, running, onPresentation };
    if (resume) timeline.current.recover(game, performance.now()); else timeline.current.accept(game, performance.now());
    wake.current?.();
  }, [game, running, onPresentation]);
  useEffect(() => {
    const root = svg.current; if (!root) return;
    const assembly = root.querySelector<SVGGElement>('.yard-assembly')!;
    const ropes = root.querySelectorAll<SVGPathElement>('[data-rope]'); const pennant = root.querySelector<SVGGElement>('[data-pennant]')!;
    const figures: FigureCache[] = Array.from(root.querySelectorAll<SVGGElement>('.yard-crew')).map(element => {
      const team = element.dataset.team as TeamId, slot = Number(element.dataset.slot);
      const grips = root.querySelector(`[data-grip="${team}-${slot}"]`)!;
      return { element, team, slot, base: team === 'coral' ? 620 - slot * 90 : 980 + slot * 90, parts: Object.fromEntries([...Array.from(element.querySelectorAll<SVGElement>('[data-part]')), ...Array.from(grips.querySelectorAll<SVGElement>('[data-part]'))].map(node => [node.dataset.part!, node])) };
    });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'); let raf = 0, mounted = true, frames = 0;
    let totalCost = 0, maxCost = 0;
    const draw = (at: number) => {
      raf = 0; if (!mounted) return;
      const started = performance.now(); const { game: live, running: online, onPresentation: announce } = current.current;
      const playing = online && !document.hidden;
      const frame = timeline.current.frame(at, playing, media.matches); if (!frame) return;
      const displacement = frame.position * SCENE.travel;
      set(assembly, 'transform', `translate(${displacement.toFixed(3)} 0)`);
      const released = live.state === 'FINISHED' && Boolean(live.result?.winner);
      const sag = released ? 38 : 10 * (1 - Math.sqrt(live.tension));
      const rope = `M200 140Q800 ${140 + sag * 2} 1400 140`;
      for (const path of ropes) set(path, 'd', rope);
      set(pennant, 'transform', `translate(800 ${140 + sag})`);
      set(root, 'data-position', frame.position.toFixed(6)); set(root, 'data-result-ready', frame.resultReady); set(root, 'data-event-sequence', frame.lastSequence);
      for (const figure of figures) {
        const state = figure.team === 'coral' ? frame.coral : frame.mint;
        const direction = figure.team === 'coral' ? 1 : -1;
        const pose = sampleRig(state, frame.phaseMs, displacement * direction, figure.team === 'coral' ? figure.base : 1600 - figure.base, live.tension, figure.slot, media.matches, frame.finishAge);
        const d = paths(pose), parts = figure.parts;
        for (const key of ['legA', 'legB', 'armA', 'armB', 'neck', 'shirt', 'stripe'] as const) set(parts[key], 'd', d[key]);
        set(parts.neckFill, 'd', d.neck); set(parts.sleeve, 'd', d.armB);
        set(parts.head, 'transform', `translate(${point(pose.head.x, pose.head.y)}) rotate(${pose.lean})`);
        set(parts.mouth, 'd', pose.mouth);
        set(parts.bootA, 'transform', `translate(${point(pose.leftFoot.x, pose.leftFoot.y - 3)})`);
        set(parts.bootB, 'transform', `translate(${point(pose.rightFoot.x, pose.rightFoot.y - 3)})`);
        for (const [key, hand] of [['handA', pose.leftHand], ['handB', pose.rightHand]] as const) { set(parts[key], 'cx', hand.x); set(parts[key], 'cy', hand.y); }
        set(parts.number, 'x', direction * (pose.shoulder.x + pose.hip.x) / 2); set(parts.number, 'y', (pose.shoulder.y + pose.hip.y) / 2 + 10);
        set(parts.shadow, 'cx', (pose.leftFoot.x + pose.rightFoot.x) / 2); set(parts.effort, 'opacity', state === 'combo' || state === 'strong_pulling' ? 0.65 : 0);
        set(figure.element, 'data-animation', state);
      }
      announce?.(frame);
      const cost = performance.now() - started; totalCost += cost; maxCost = Math.max(maxCost, cost); frames++;
      if (frames % 30 === 0) { set(root, 'data-render-frames', frames); set(root, 'data-render-average-ms', (totalCost / frames).toFixed(3)); set(root, 'data-render-max-ms', maxCost.toFixed(3)); }
      if (frame.motion && playing && !media.matches) raf = requestAnimationFrame(draw);
    };
    const refresh = () => { if (raf) cancelAnimationFrame(raf); raf = 0; draw(performance.now()); };
    wake.current = refresh; media.addEventListener('change', refresh); document.addEventListener('visibilitychange', refresh); refresh();
    return () => { mounted = false; cancelAnimationFrame(raf); wake.current = null; media.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [coral, mint]);
  return <svg ref={svg} className={`tug-scene game-art ${compact ? 'game-art-compact' : ''}`} viewBox="0 0 1600 270" aria-hidden="true" data-roster-count={coral + mint}>
    <defs><pattern id={`braid-${id}`} width="12" height="8" patternUnits="userSpaceOnUse"><rect width="12" height="8" fill="var(--rope)" /><path d="m-3 8 7-8m5 8 7-8" stroke="var(--rope-shadow)" strokeWidth="2" /></pattern></defs>
    <path d="M42 48Q800 23 1558 48L1560 203H40Z" fill="var(--paper)" />
    <path d="M40 203Q390 193 800 205Q1180 193 1560 203L1537 265H63Z" fill="var(--paper)" stroke="var(--text-primary)" strokeWidth="2.5" />
    <path d="M42 205q365-15 758 2v55H65Z" fill="var(--team-a-soft)" /><path d="M800 207q388-17 758-2l-23 57H800Z" fill="var(--team-b-soft)" />
    <path d="M92 245h1416M800 191v71" stroke="var(--border-control)" strokeWidth="2" strokeDasharray="7 8" />
    <ellipse cx="800" cy="237" rx="49" ry="14" fill="none" stroke="var(--rope-shadow)" strokeWidth="2" />
    <g fill="none" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round">
      <path d="M110 222V122m1380 100V122" /><path d="m110 124 45 9-45 18" fill="var(--team-a)" /><path d="m1490 124-45 9 45 18" fill="var(--team-b)" />
      <path d="M650 161v94m300-94v94" strokeWidth="2" strokeDasharray="4 5" />
    </g>
    <path d="m640 168-12 4 12 4m320-8 12 4-12 4" fill="var(--rope-shadow)" />
    <g fontFamily="var(--font-display)" fontSize="17" fontWeight="600" textAnchor="middle"><text x="650" y="267" fill="var(--team-a-ink)">CORAL FINISH</text><text x="950" y="267" fill="var(--team-b-ink)">MINT FINISH</text></g>
    <g stroke="var(--team-b-ink)" strokeWidth="2" opacity=".3" fill="none"><path d="m182 254 4-7 4 7m274-4 3-6 3 6m648 4 4-7 4 7m239-4 3-6 3 6" /></g>
    <g className="yard-assembly pulling-group">
      {teams.flatMap(team => Array.from({ length: team === 'coral' ? coral : mint }, (_, slot) => <CrewFigure key={`${team}-${slot}`} team={team} slot={slot} />))}
      <path data-rope="outline" d="M200 140Q800 160 1400 140" fill="none" stroke="var(--text-primary)" strokeWidth="12" strokeLinecap="round" />
      <path data-rope="braid" d="M200 140Q800 160 1400 140" fill="none" stroke={`url(#braid-${id})`} strokeWidth="8" strokeLinecap="round" />
      <g data-pennant="" transform="translate(800 150)"><path d="M0 0v43l28-11L0 20" fill="var(--paper)" stroke="var(--text-primary)" strokeWidth="3" strokeLinejoin="round" /><path d="m5 21 15 10-15 5Z" fill="var(--rope)" /><path d="M-8 0q8-12 16 0-8 12-16 0Z" fill="var(--rope)" stroke="var(--text-primary)" strokeWidth="2.5" /></g>
      {teams.flatMap(team => Array.from({ length: team === 'coral' ? coral : mint }, (_, slot) => <g key={`${team}-${slot}`} data-grip={`${team}-${slot}`} transform={`translate(${team === 'coral' ? 620 - slot * 90 : 980 + slot * 90} 0) ${team === 'mint' ? 'scale(-1 1)' : ''}`} fill="var(--paper)" stroke="var(--text-primary)" strokeWidth="2.5"><circle data-part="handA" cx="27" cy="148" r="6" /><circle data-part="handB" cx="37" cy="148" r="6" /></g>))}
    </g>
  </svg>;
}
