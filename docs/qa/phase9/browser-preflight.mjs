import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(resolve('package.json'));
const { chromium } = require('playwright');
const origin = 'http://localhost:3000', directory = 'docs/qa/phase9';
await mkdir(directory, { recursive: true });
const report = { capturedAt: new Date().toISOString(), scope: 'Actual localhost production UI + Node + public SSE; no Twitch inputs, no simulation, no native OBS', status: 'FAIL', step: 'start', pageErrors: 0 };
const browser = await chromium.launch();
const control = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 1000 } });
const viewer = await browser.newContext({ baseURL: origin, viewport: { width: 1920, height: 1080 } });
try {
  report.step = 'backend health';
  const health = await fetch('http://127.0.0.1:3001/health'); assert(health.ok); const healthData = await health.json();
  report.backend = { reachable: true, twitchConfigured: healthData.twitchConfigured, protocolVersion: healthData.protocolVersion };
  report.step = 'connection page';
  const page = await control.newPage(); page.on('pageerror', () => report.pageErrors++);
  await page.goto('/dashboard/connection'); await page.locator('.connection-state-not_connected').waitFor();
  const response = await control.request.get('/api/session'); assert(response.ok()); const view = await response.json();
  report.session = { state: view.snapshot.state, mode: view.snapshot.mode, authorized: view.snapshot.authorized, credentialsConfigured: view.snapshot.credentialsConfigured, issue: view.snapshot.issue, persistence: view.snapshot.persistence, recognizedInputs: view.snapshot.counters.recognized, gameState: view.snapshot.game.state };
  assert.equal(view.snapshot.credentialsConfigured, false); assert.equal(view.snapshot.authorized, false); assert.equal(view.snapshot.mode, 'idle');
  await page.screenshot({ path: `${directory}/connection-not-configured.png`, fullPage: true });
  report.step = 'live evidence gate';
  const evidence = await control.request.get('/api/evidence'); assert.equal(evidence.status(), 409); report.liveEvidenceHttpStatus = evidence.status();
  report.step = 'overlay setup';
  await page.goto('/dashboard/overlay'); await page.locator('#arena-source-url').waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector('#arena-source-url')?.value));
  assert.equal(await page.locator('#arena-source-url').getAttribute('type'), 'password');
  await page.screenshot({ path: `${directory}/overlay-setup-ready.png`, fullPage: true });
  const keyResponse = await control.request.get('/api/game/overlay-key'); assert(keyResponse.ok()); const { key } = await keyResponse.json();
  report.step = 'public standby source';
  const source = await viewer.newPage(); source.on('pageerror', () => report.pageErrors++);
  await source.goto(`/overlay#room=${key}`); await source.locator('.broadcast-field[data-connection="current"]').waitFor();
  await source.evaluate(() => document.fonts.ready);
  report.overlay = await source.evaluate(() => ({ viewport: [innerWidth, innerHeight], bodyBackground: getComputedStyle(document.body).backgroundColor, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, characterCount: document.querySelectorAll('.yard-crew').length, position: Number(document.querySelector('.game-art')?.getAttribute('data-position')), buttons: document.querySelectorAll('button').length }));
  assert.equal(report.overlay.bodyBackground, 'rgba(0, 0, 0, 0)'); assert.equal(report.overlay.scrollWidth, 1920); assert.equal(report.overlay.scrollHeight, 1080); assert.equal(report.overlay.buttons, 0); assert.equal(report.overlay.position, 0);
  report.overlay.sessionCookies = (await viewer.cookies()).filter(cookie => cookie.name === 'cta_session').length; assert.equal(report.overlay.sessionCookies, 0);
  await source.screenshot({ path: `${directory}/overlay-standby-1920.png`, omitBackground: true });
  await source.setViewportSize({ width: 1280, height: 720 }); await source.screenshot({ path: `${directory}/overlay-standby-1280.png`, omitBackground: true });
  const baseline = JSON.parse(await readFile('docs/qa/phase8/materials-check.json', 'utf8'));
  report.runtimeSourceMatchesPhase8 = {};
  for (const [path, hash] of Object.entries(baseline.runtimeSourceHashes)) report.runtimeSourceMatchesPhase8[path] = createHash('sha256').update(await readFile(path)).digest('hex') === hash;
  assert(Object.values(report.runtimeSourceMatchesPhase8).every(Boolean)); assert.equal(report.pageErrors, 0);
  report.status = 'PASS'; report.step = 'complete'; report.actualLiveTwitchVerified = false; report.actualObsVerified = false;
} catch (error) {
  // A browser failure can include a private fragment URL; emit only step/class, never raw errors.
  report.errorClass = error?.constructor?.name ?? 'Error'; process.exitCode = 1;
} finally {
  await control.close(); await viewer.close(); await browser.close();
  await writeFile(`${directory}/browser-preflight.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, step: report.step, actualLiveTwitchVerified: false, actualObsVerified: false, pageErrors: report.pageErrors }));
}
