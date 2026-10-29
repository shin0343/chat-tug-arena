import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, type Page } from 'playwright';
import { CONNECTION_STATES, DEFAULT_KEYWORDS, EMPTY_COUNTERS, DEFAULT_CONFIG, DEFAULT_SHOWDOWN, type ConnectionSnapshot, type SessionView } from '../packages/contracts/src/index.js';

// Real production UI/API/SSE captures. No injected CSS, clock seeking, or fabricated game results.
const pass = process.argv.includes('--after') ? 'after' : 'before';
const directory = `docs/qa/phase6/${pass}`;
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
await mkdir(`${directory}/motion/raw`, { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [], captures: object[] = [];
const control = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 1000 } });
const page = await control.newPage();
page.on('pageerror', error => errors.push(error.message));
async function shot(target: Page, name: string, transparent = false, fullPage = false) {
  await target.evaluate(() => document.fonts.ready);
  await target.screenshot({ path: `${directory}/${name}.png`, omitBackground: transparent, fullPage });
  captures.push({ name, viewport: target.viewportSize(), path: new URL(target.url()).pathname, geometry: await target.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight, elements: ['.sidebar','.workspace-topbar','.page-heading','.consequence-card','.broadcast-scoreboard','.broadcast-clock','.game-art','.connection-privacy','.field label','.obs-instructions li p','.showdown-setup .form-save'].flatMap(selector => { const e = document.querySelector(selector); if (!e) return []; const box = e.getBoundingClientRect(); return [{ selector, x: box.x, y: box.y, width: box.width, height: box.height, fontSize: getComputedStyle(e).fontSize }]; }) })) });
  await writeFile(`${directory}/captures.json`, JSON.stringify({ pass, completed: false, captures, errors }, null, 2) + '\n');
  console.log(`Captured ${pass}/${name}`);
}
const session = async () => await (await control.request.get('/api/session')).json() as SessionView;
async function action(name: string, payload: object = {}) {
  const state = await session();
  const response = await control.request.post(`/api/game/${name}`, { headers: { Origin: origin, 'X-CSRF-Token': state.csrfToken }, data: { roundId: state.snapshot.game!.roundId, expectedState: state.snapshot.game!.state, ...payload } });
  assert(response.ok(), `${name}: ${response.status()} ${await response.text()}`);
  return await response.json() as SessionView;
}
const wait = (target: Page, state: string) => target.locator(`.authoritative-arena[data-state="${state}"]`).waitFor({ timeout: 15000 });
try {
  for (const [name, route] of [['landing', '/'], ['setup', '/setup'], ['dashboard-empty', '/dashboard'], ['configuration', '/dashboard/round'], ['connection', '/dashboard/connection'], ['obs-setup', '/dashboard/overlay'], ['history-empty', '/dashboard/history']] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(route); await page.evaluate(() => document.fonts.ready);
    if (route.includes('dashboard') || route === '/setup') await page.waitForFunction(() => !document.querySelector('.workspace-topbar .status')?.textContent?.includes('Checking') && !document.querySelector('.connection-system-notice')?.textContent?.includes('Checking'));
    if (route === '/dashboard/overlay' || route === '/dashboard') { await page.locator('.source-iframe').waitFor(); await page.locator('.source-iframe').contentFrame().locator('.broadcast-field[data-connection="current"]').waitFor(); await page.locator('.source-iframe').contentFrame().locator('.broadcast-canvas').evaluate(() => document.fonts.ready); }
    await shot(page, `${name}-1440`);
    await page.setViewportSize({ width: 390, height: 844 }); await shot(page, `${name}-390`);
    if (route === '/dashboard/overlay') await shot(page, 'obs-setup-full-390', false, true);
    if (route === '/dashboard/round' || route === '/') { await page.setViewportSize({ width: 1440, height: 1000 }); await shot(page, `${name}-full-1440`, false, true); }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard/round'); await page.getByLabel('Coral keyword', { exact: true }).fill('!same'); await page.getByLabel('Mint keyword', { exact: true }).fill('!SAME'); await page.getByRole('button', { name: 'Save showdown', exact: true }).click(); await shot(page, 'configuration-error-1440');
  await action('configure', { settingsRevision: (await session()).snapshot.showdown!.settingsRevision, config: DEFAULT_SHOWDOWN, commands: { coral: '!mage', mint: '!knight' } });
  const viewer = await browser.newContext({ baseURL: origin, viewport: { width: 1920, height: 1080 }, recordVideo: { dir: `${directory}/motion/raw`, size: { width: 1280, height: 720 } } });
  const overlay = await viewer.newPage(); overlay.on('pageerror', error => errors.push(error.message));
  const { key } = await (await control.request.get('/api/game/overlay-key')).json() as { key: string };
  await overlay.goto(`/overlay#room=${key}`); await overlay.locator('.game-art').waitFor();
  await shot(overlay, 'overlay-idle-1920', true);
  await action('rehearse'); await page.goto('/dashboard'); await wait(page, 'READY'); await shot(page, 'ready-1440');
  await action('start'); await wait(overlay, 'COUNTDOWN'); await shot(overlay, 'overlay-countdown-1920', true); await shot(page, 'countdown-1440');
  await wait(overlay, 'ACTIVE');
  await overlay.waitForFunction(() => document.querySelector('.yard-combo[data-active="true"]'));
  await shot(overlay, 'overlay-combo-1920', true); await shot(page, 'active-combo-1440');
  await wait(overlay, 'FINISHED'); await shot(overlay, 'overlay-winner-1920', true);
  await overlay.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-result-ready') === 'true');
  await shot(overlay, 'overlay-result-1920', true); await shot(page, 'result-1440');
  await page.setViewportSize({ width: 390, height: 844 }); await shot(page, 'result-390');
  await overlay.setViewportSize({ width: 1280, height: 720 }); await shot(overlay, 'overlay-result-1280', true);
  await action('commit'); await page.setViewportSize({ width: 1440, height: 1000 }); await shot(page, 'committed-1440');
  await page.goto('/dashboard/history'); await page.getByRole('list', { name: 'Showdown history' }).waitFor(); await shot(page, 'history-1440');
  const video = overlay.video(); await viewer.close(); if (video) await video.saveAs(`${directory}/motion/showdown.webm`);
  await action('reset');
  // Causality, balance and reversal on actual authoritative simulation input, separately disclosed.
  const scene = await browser.newContext({ baseURL: origin, viewport: { width: 1920, height: 1080 }, recordVideo: { dir: `${directory}/motion/raw`, size: { width: 1280, height: 720 } } });
  const stage = await scene.newPage(); stage.on('pageerror', error => errors.push(error.message)); await stage.goto(`/overlay#room=${key}`); await stage.locator('.game-art').waitFor();
  await action('simulate', { scenario: 'quiet', seed: 42, config: DEFAULT_CONFIG }); await wait(stage, 'ACTIVE');
  const pull = (team: 'coral' | 'mint', count: number, viewer: string) => action('test-input', { team, count, viewer });
  await pull('coral', 3, 'a-start'); await pull('mint', 3, 'b-start'); await stage.waitForTimeout(180); await shot(stage, 'overlay-balanced-1920', true);
  await pull('coral', 10, 'a-rush'); await stage.waitForFunction(() => Number(document.querySelector('.game-art')?.getAttribute('data-position')) < -.07); await shot(stage, 'overlay-coral-lead-1920', true);
  await pull('mint', 12, 'b-rush-one'); await pull('mint', 12, 'b-rush-two');
  await stage.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-notice') === 'swing'); await shot(stage, 'overlay-reversal-1920', true);
  await action('pause'); await wait(stage, 'PAUSED');
  await page.goto('/dashboard'); await wait(page, 'PAUSED'); await shot(page, 'paused-1440'); await page.setViewportSize({ width: 390, height: 844 }); await shot(page, 'paused-390');
  await scene.setOffline(true); await stage.getByText('Arena updates unavailable', { exact: true }).waitFor(); await shot(stage, 'overlay-disconnected-1920', true); await scene.setOffline(false); await wait(stage, 'PAUSED');
  await action('abandon');
  const motion = stage.video(); await scene.close(); if (motion) await motion.saveAs(`${directory}/motion/reversal.webm`);
  // Real seeded comeback, no client animation or injected result changes the simulation.
  const comeback = await browser.newContext({ baseURL: origin, viewport: { width: 1920, height: 1080 } }); const field = await comeback.newPage(); await field.goto(`/overlay#room=${key}`);
  await action('simulate', { scenario: 'late_comeback', seed: 42, config: DEFAULT_CONFIG });
  await field.waitForFunction(() => document.querySelector('.broadcast-field')?.getAttribute('data-notice') === 'comeback', undefined, { timeout: 55000 }); await shot(field, 'overlay-comeback-1920', true);
  await action('abandon'); await comeback.close();
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.route('**/api/session', route => route.abort()); await page.goto('/dashboard/connection'); await page.getByText('Control room updates are unavailable.', { exact: true }).waitFor(); await shot(page, 'server-error-1440'); await page.unroute('**/api/session');
  // Genuine server rejection of an invalid OAuth return; no provider consent is implied.
  await page.goto('/api/auth/twitch/callback?error=access_denied'); await page.getByText('This authorization link expired or belongs to another session. Start again from this page.').waitFor(); await shot(page, 'oauth-invalid-return-1440');
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/session', async route => { await held; await route.continue(); }); await page.goto('/dashboard/connection'); await page.getByText('Checking the connection server…').waitFor(); await shot(page, 'loading-1440'); release(); await page.locator('.connection-system-notice').waitFor({ state: 'detached' }); await page.unroute('**/api/session');
  // UI state coverage only. Existing runtime shows a prominent fixture banner in every capture.
  for (const state of CONNECTION_STATES) {
    const fixture = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 1000 } }); const screen = await fixture.newPage();
    const snapshot: ConnectionSnapshot = { protocolVersion: 2, revision: 1, state, mode: state === 'simulation' ? 'simulation' : ['connected','connecting','reconnecting'].includes(state) ? 'twitch' : 'idle', channel: ['connected','connecting','reconnecting'].includes(state) ? { id: '123', login: 'fixture_broadcaster', displayName: 'Fixture broadcaster' } : null, credentialsConfigured: true, authorized: ['connected','connecting','reconnecting'].includes(state), persistence: 'encrypted', issue: state === 'authorization_expired' ? 'authorization_revoked' : state === 'connection_failed' ? 'reconnect_exhausted' : state === 'reconnecting' ? 'transport_lost' : null, notice: null, commands: { ...DEFAULT_KEYWORDS }, inputs: [], counters: { ...EMPTY_COUNTERS }, lastEventAt: null, lastHeartbeatAt: null, reconnectAttempt: state === 'reconnecting' ? 2 : 0, simulation: state === 'simulation' ? { running: true, step: 'quiet' } : null, evidence: { origin: 'test_fixture', liveMessageReceivedAt: null, eventId: null } };
    await screen.route('**/api/session', route => route.fulfill({ json: { csrfToken: 'x'.repeat(43), snapshot } }));
    // Raw browser script avoids tsx's Node-side named-class helper in the page execution context.
    await screen.addInitScript({ content: `{ const data = ${JSON.stringify(snapshot)}; class FixtureEvents extends EventTarget { constructor() { super(); this.onerror = null; this.timer = setInterval(() => this.dispatchEvent(new MessageEvent('connection.snapshot', { data: JSON.stringify({ type: 'connection.snapshot', snapshot: data }) })), 100); } close() { clearInterval(this.timer); } } window.EventSource = FixtureEvents; }` });
    await screen.goto('/dashboard/connection'); await screen.locator(`.connection-state-${state}`).waitFor(); await shot(screen, `oauth-fixture-${state}-1440`);
    if (['connected','authorization_expired','reconnecting'].includes(state)) { await screen.setViewportSize({ width: 390, height: 844 }); await shot(screen, `oauth-fixture-${state}-390`); }
    await fixture.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/captures.json`, JSON.stringify({ pass, completed: true, source: 'Actual running production browser; disclosed local simulation for game states; OAuth fixture files are explicitly labeled UI coverage', captures, errors }, null, 2) + '\n');
} finally { await control.close(); await browser.close(); }
