import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { DEFAULT_CONFIG, type GameScenario, type RoundConfig, type SessionView } from '../packages/contracts/src/index.js';

// Actual local server + public source. No fixture auth, browser clock seeking or forged game snapshots.
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const directory = process.env.QA_OUTPUT_DIRECTORY ?? 'docs/qa/phase4';
await mkdir(`${directory}/motion`, { recursive: true });
const browser = await chromium.launch();
const shots: object[] = [], performanceReports: object[] = [];
const browserErrors: string[] = [];
async function room(video?: string, config: RoundConfig = DEFAULT_CONFIG) {
  const control = await browser.newContext({ baseURL: origin });
  const viewer = await browser.newContext({ baseURL: origin, viewport: { width: 1920, height: 1080 }, ...(video ? { recordVideo: { dir: `${directory}/motion/raw`, size: { width: 1280, height: 720 } } } : {}) });
  const page = await viewer.newPage(); page.on('pageerror', e => browserErrors.push(e.message));
  const session = async () => { const response = await control.request.get('/api/session'); assert(response.ok()); return await response.json() as SessionView; };
  const action = async (name: string, payload: object = {}) => {
    const state = await session(); const response = await control.request.post(`/api/game/${name}`, { headers: { Origin: origin, 'X-CSRF-Token': state.csrfToken }, data: { roundId: state.snapshot.game!.roundId, expectedState: state.snapshot.game!.state, ...payload } });
    assert(response.ok(), `${name} returned ${response.status()}`); return await response.json() as SessionView;
  };
  await session(); const response = await control.request.get('/api/game/overlay-key'); const { key } = await response.json() as { key: string };
  await page.goto(`/overlay#room=${key}`); await page.waitForSelector('.game-art'); await page.evaluate(() => document.fonts.ready);
  const wait = (state: string, timeout = 6000) => page.waitForFunction(value => document.querySelector('.broadcast-field')?.getAttribute('data-state') === value, state, { timeout });
  const start = async (scenario: GameScenario = 'quiet') => { await action('simulate', { scenario, seed: 42, config }); await wait('COUNTDOWN'); };
  const pull = (team: 'coral' | 'mint', count: number, viewer: string) => action('test-input', { team, count, viewer });
  const shot = async (name: string) => {
    await page.screenshot({ path: `${directory}/${name}.png`, omitBackground: true });
    const game = (await session()).snapshot.game!;
    const geometry = await page.evaluate(() => {
      const scene = document.querySelector('.broadcast-field')!.getBoundingClientRect(), canvas = document.querySelector('.broadcast-canvas')!.getBoundingClientRect();
      return { viewport: [innerWidth, innerHeight], scene: { x: scene.x, y: scene.y, width: scene.width, height: scene.height }, aspect: canvas.width / canvas.height, scrollWidth: document.documentElement.scrollWidth,
        poses: Array.from(document.querySelectorAll('.yard-crew')).map(node => node.getAttribute('data-animation')), renderedX: Number(document.querySelector('.game-art')!.getAttribute('data-position')), roster: document.querySelectorAll('.yard-crew').length };
    });
    assert(geometry.roster <= 10); assert(geometry.scrollWidth <= geometry.viewport[0]!); assert(Math.abs(geometry.aspect - 16 / 9) < 0.001);
    shots.push({ name, source: 'actual server simulation through public SSE', state: game.state, position: game.position, remainingMs: game.remainingMs, uniqueViewers: game.uniqueViewers, winner: game.result?.winner, eventSequence: game.lastEventSequence, ...geometry });
  };
  return { control, viewer, page, session, action, wait, start, pull, shot, async close() {
    const game = (await session()).snapshot.game!;
    if (['COUNTDOWN', 'READY', 'ACTIVE', 'PAUSED'].includes(game.state)) await action('abandon');
    const recording = page.video(); await viewer.close(); if (video && recording) await recording.saveAs(`${directory}/motion/${video}.webm`);
    await control.close();
  } };
}

async function interactions() {
  const r = await room('pull-combo-reversal');
  try {
    await r.shot('idle-1920'); await r.start(); await r.shot('countdown-1920'); await r.wait('ACTIVE');
    await r.pull('coral', 3, 'coral-start'); await r.pull('mint', 3, 'mint-start'); await r.page.waitForTimeout(250);
    await r.shot('balanced-1920'); await r.shot('combo-1920');
    const paths = await r.page.evaluate(async () => { const frames: string[] = []; for (let n = 0; n < 20; n++) { await new Promise(requestAnimationFrame); frames.push(document.querySelector('.yard-crew [data-part="shirt"]')!.getAttribute('d')!); } return new Set(frames).size; });
    assert(paths > 5, 'Pull poses must visibly change, not only translate a static avatar');
    await r.pull('coral', 10, 'coral-rush'); await r.page.waitForFunction(() => Number(document.querySelector('.game-art')?.getAttribute('data-position')) < -0.07); await r.shot('coral-lead-1920');
    await r.pull('mint', 12, 'mint-rush-one'); await r.pull('mint', 12, 'mint-rush-two');
    await r.page.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-notice') === 'swing', undefined, { timeout: 5000 }); await r.shot('momentum-reversal-1920');
    await r.page.waitForFunction(() => Number(document.querySelector('.game-art')?.getAttribute('data-position')) > 0.05); await r.shot('mint-lead-1920');
    await r.action('pause'); await r.wait('PAUSED');
    const viewports = [[1280, 720], [960, 540], [640, 360], [390, 844], [1920, 1080]];
    for (const [width, height] of viewports) { await r.page.setViewportSize({ width: width!, height: height! }); await r.shot(`scaled-${width}`); }
    const location = await r.page.locator('.yard-assembly').getAttribute('transform'); await r.page.waitForTimeout(300); assert.equal(await r.page.locator('.yard-assembly').getAttribute('transform'), location);
    await r.viewer.setOffline(true); await r.page.getByText('Arena updates unavailable', { exact: true }).waitFor(); await r.shot('connection-interruption-1920');
    await r.viewer.setOffline(false); await r.page.getByText('Paused', { exact: true }).waitFor({ timeout: 6000 });
    assert.equal((await r.viewer.cookies()).length, 0, 'Public source has no control cookie');
  } finally { await r.close(); }
}
async function victory() {
  const r = await room('victory-result');
  try { await r.start('early_blowout'); await r.wait('FINISHED', 12000); await r.shot('victory-1920'); await r.page.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-result-ready') === 'true'); await r.shot('result-1920'); await r.page.waitForTimeout(350); }
  finally { await r.close(); }
}
async function comeback() {
  const r = await room('late-comeback');
  try {
    await r.start('late_comeback'); await r.page.waitForFunction(() => Number(document.querySelector('.game-art')?.getAttribute('data-position')) < -0.5, undefined, { timeout: 35000 }); await r.shot('late-deficit-1920');
    await r.page.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-notice') === 'comeback', undefined, { timeout: 20000 }); await r.shot('comeback-1920');
    await r.wait('FINISHED', 16000); await r.page.waitForTimeout(1600); await r.shot('mint-result-1920');
  } finally { await r.close(); }
}
async function finalCountdown() {
  const r = await room(undefined, { ...DEFAULT_CONFIG, durationSeconds: 30 });
  try {
    await r.start(); await r.page.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-final-countdown') === 'true', undefined, { timeout: 35000 }); await r.shot('final-countdown-1920');
    const sizes = await r.page.evaluate(async () => { const widths: number[] = []; for (let i = 0; i < 30; i++) { await new Promise(requestAnimationFrame); widths.push(document.querySelector('.yard-clock-digits')!.getBoundingClientRect().width); } return widths; });
    assert(Math.max(...sizes) > Math.min(...sizes), 'Final countdown has a restrained timed pulse');
    await r.wait('FINISHED', 7000); await r.page.waitForTimeout(1450); await r.shot('no-participation-result-1920');
  } finally { await r.close(); }
}
async function frameProbe() {
  const r = await room(undefined, { ...DEFAULT_CONFIG, durationSeconds: 90 });
  try {
    await r.start(); await r.wait('ACTIVE'); await r.pull('coral', 10, 'coral'); await r.pull('mint', 10, 'mint');
    let pending = Promise.resolve();
    const repeat = setInterval(() => { pending = pending.then(() => r.pull('coral', 10, 'coral')).then(() => r.pull('mint', 10, 'mint')).then(() => {}).catch(e => { browserErrors.push(String(e)); }); }, 2400);
    try {
      const cdp = await r.viewer.newCDPSession(r.page); await cdp.send('Performance.enable'); const before = await cdp.send('Performance.getMetrics');
      // A string keeps tsx/esbuild's Node-side __name helper out of the browser execution context.
      const sample = await r.page.evaluate<{ durationMs: number; frames: number; meanIntervalMs: number; p95IntervalMs: number; maximumIntervalMs: number; longTasks: number[]; domNodes: number; characters: number; particles: number; rendererAverageMs: string | null; rendererMaximumMs: string | null; resources: {name: string; bytes: number}[] }>(`(async () => {
        const intervals = [], tasks = []; let previous = 0;
        const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) tasks.push(entry.duration); }); observer.observe({ type: 'longtask', buffered: false });
        const started = performance.now();
        await new Promise(resolve => { const frame = time => { if (previous) intervals.push(time - previous); previous = time; if (time - started < 8000) requestAnimationFrame(frame); else resolve(); }; requestAnimationFrame(frame); });
        observer.disconnect(); const sorted = [...intervals].sort((a, b) => a - b); const art = document.querySelector('.game-art');
        return { durationMs: performance.now() - started, frames: intervals.length, meanIntervalMs: intervals.reduce((a, b) => a + b, 0) / intervals.length, p95IntervalMs: sorted[Math.floor(sorted.length * 0.95)], maximumIntervalMs: sorted.at(-1), longTasks: tasks, domNodes: document.querySelectorAll('*').length, characters: document.querySelectorAll('.yard-crew').length, particles: 0, rendererAverageMs: art.getAttribute('data-render-average-ms'), rendererMaximumMs: art.getAttribute('data-render-max-ms'), resources: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/game/')).map(entry => ({ name: new URL(entry.name).pathname, bytes: entry.transferSize })) };
      })()`);
      const after = await cdp.send('Performance.getMetrics'); const metric = (list: typeof before, name: string) => list.metrics.find((m: { name: string }) => m.name === name)?.value ?? 0;
      assert.equal(sample.characters, 10);
      performanceReports.push({ source: 'Chromium headless, 1920x1080, ten characters, actual SSE, video recording disabled', ...sample, observedRafHz: 1000 / sample.meanIntervalMs, taskDurationMs: (metric(after, 'TaskDuration') - metric(before, 'TaskDuration')) * 1000, scriptDurationMs: (metric(after, 'ScriptDuration') - metric(before, 'ScriptDuration')) * 1000, layoutDurationMs: (metric(after, 'LayoutDuration') - metric(before, 'LayoutDuration')) * 1000 });
      await r.shot('maximum-crowd-1920'); await r.page.emulateMedia({ reducedMotion: 'reduce' }); await r.page.waitForTimeout(300); await r.shot('reduced-motion-1920');
    } finally { clearInterval(repeat); await pending; }
  } finally { await r.close(); }
}
try {
  const performanceOnly = process.argv.includes('--performance-only');
  if (!performanceOnly) {
    await interactions();
    // Independent server rooms, no shared authority. This phase records art evidence, not frame-rate measurements.
    await Promise.all([victory(), comeback(), finalCountdown()]);
  }
  await frameProbe(); assert.deepEqual(browserErrors, []);
  await writeFile(`${directory}/runtime-performance.json`, JSON.stringify(performanceReports, null, 2) + '\n');
  if (!performanceOnly) await writeFile(`${directory}/visual-report.json`, JSON.stringify({ environment: { node: process.version, browser: await browser.version(), nativeObsTested: false, realTwitchTested: false }, shots, performance: performanceReports, browserErrors }, null, 2) + '\n');
  console.log(JSON.stringify({ screenshots: shots.length, performance: performanceReports, browserErrors }, null, 2));
} finally { await browser.close(); }
