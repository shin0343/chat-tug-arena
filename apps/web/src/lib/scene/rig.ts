import { SCENE, clamp, type CrewAnimation } from './presentation';

export interface Point { x: number; y: number; }
export interface RigPose {
  hip: Point; shoulder: Point; head: Point; leftFoot: Point; rightFoot: Point; leftHand: Point; rightHand: Point;
  leftElbow: Point; rightElbow: Point; leftKnee: Point; rightKnee: Point; lean: number; effort: number; mouth: string;
}
const p = (x: number, y: number): Point => ({ x, y });
const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
/** Two fixed-length segments, meeting exactly at the supplied hand/foot. */
export function joint(start: Point, end: Point, lengthA: number, lengthB: number, bend: 1 | -1): Point {
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const along = clamp((lengthA * lengthA - lengthB * lengthB + distance * distance) / (2 * distance), 0, lengthA);
  const perpendicular = Math.sqrt(Math.max(0, lengthA * lengthA - along * along));
  return p(start.x + dx / distance * along - dy / distance * perpendicular * bend, start.y + dy / distance * along + dx / distance * perpendicular * bend);
}
export function ropeHeight(x: number, tension: number, released = false) {
  const t = clamp((x - 200) / 1200);
  const sag = released ? 38 : 10 * (1 - Math.sqrt(clamp(tension)));
  return 140 + 4 * t * (1 - t) * sag;
}
/** Most of each stride is a planted foot; only its last quarter lifts and steps. Reversible, no random walk. */
export function footPlant(displacement: number, offset: number) {
  const cycle = (displacement + offset) / 24;
  const cell = Math.floor(cycle), fraction = cycle - cell;
  const step = smooth((fraction - 0.75) / 0.25);
  return { x: (cell + step) * 24 - offset - displacement, lift: Math.sin(step * Math.PI) * 6 };
}
export function sampleRig(state: CrewAnimation, phaseMs: number, displacement: number, anchor: number, tension: number, slot: number, reduced = false, finishAge = 2000): RigPose {
  const coordinated = state === 'combo';
  const effort = state === 'strong_pulling' || coordinated ? 1 : state === 'pulling' ? 0.5 : state === 'losing_balance' ? 0.8 : 0;
  const phase = phaseMs / 1000 * (coordinated ? 2 : state === 'strong_pulling' ? 1.8 : 1.3) * Math.PI * 2 + (coordinated ? 0 : slot * 0.36);
  const stroke = reduced ? 0 : Math.sin(phase) * effort;
  let hip = p(-6 - effort * 4 - stroke * 3.5, 169 + effort * 6 + stroke * 2.5);
  let shoulder = p(-14 - effort * 10 - stroke * 6, 122 + effort * 7 + stroke * 2.5);
  let lean = -8 - effort * 6;
  const plantA = footPlant(displacement, 0), plantB = footPlant(displacement, 12);
  let leftFoot = p(-28 + plantA.x, SCENE.ground - (reduced ? 0 : plantA.lift));
  let rightFoot = p(26 + plantB.x, SCENE.ground - (reduced ? 0 : plantB.lift));
  let leftHand = p(27, ropeHeight(anchor + 27, tension));
  let rightHand = p(37, ropeHeight(anchor + 37, tension));
  let mouth = 'M-1 8q5 3 9 0';
  if (state === 'preparing') { const anticipate = reduced ? 1 : smooth(phaseMs / 3000); hip = p(-3 - 3 * anticipate, 171 + 3 * anticipate); shoulder = p(-7 - 5 * anticipate, 124 + 4 * anticipate); lean = -4 - 4 * anticipate; mouth = 'M0 9h7'; }
  if (state === 'losing_balance') { hip.x = 2 + stroke; shoulder.x = -15 + stroke; shoulder.y += 4; rightFoot.y -= reduced ? 0 : Math.max(0, stroke) * 3; mouth = 'M0 9q4-4 8 0'; }
  if (state === 'victory') {
    const t = clamp(finishAge / 900); const hop = reduced || t >= 1 ? 0 : Math.sin(t * Math.PI) * 12;
    hip = p(-2, 165 - hop); shoulder = p(-2, 117 - hop); lean = 0;
    leftFoot = p(-24, SCENE.ground - hop); rightFoot = p(24, SCENE.ground - hop);
    leftHand = p(-31, 82 - hop); rightHand = p(31, 82 - hop); mouth = 'M-2 7q6 10 12 0Z';
  }
  if (state === 'defeat') {
    const t = reduced ? 1 : smooth(finishAge / 450);
    hip = p(-4, 169 + 29 * t); shoulder = p(-8, 123 + 37 * t); lean = -8;
    leftFoot = p(-34, SCENE.ground); rightFoot = p(34, SCENE.ground);
    leftHand = p(20, 145 + 53 * t); rightHand = p(30, 145 + 53 * t); mouth = 'M0 10q4-4 8 0';
  }
  const head = p(shoulder.x + 1, shoulder.y - 30);
  return { hip, shoulder, head, leftFoot, rightFoot, leftHand, rightHand, lean, effort, mouth,
    leftElbow: joint(shoulder, leftHand, 38, 34, 1), rightElbow: joint(p(shoulder.x + 8, shoulder.y + 3), rightHand, 34, 34, 1),
    leftKnee: joint(hip, leftFoot, 36, 34, 1), rightKnee: joint(p(hip.x + 6, hip.y), rightFoot, 36, 34, -1) };
}
const n = (v: number) => v.toFixed(2);
export const segment = (a: Point, b: Point, c: Point) => `M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}L${n(c.x)} ${n(c.y)}`;
export function shirt(pose: RigPose) {
  const s = pose.shoulder, h = pose.hip;
  return `M${n(s.x - 15)} ${n(s.y - 6)}Q${n(s.x)} ${n(s.y - 14)} ${n(s.x + 17)} ${n(s.y - 5)}L${n(h.x + 17)} ${n(h.y + 3)}Q${n(h.x)} ${n(h.y + 8)} ${n(h.x - 18)} ${n(h.y + 3)}Z`;
}
