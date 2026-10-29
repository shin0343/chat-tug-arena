import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { DEFAULT_SHOWDOWN, type SessionView } from '../../packages/contracts/src/index';

test('an early session bootstrap retries rotation without replacing the committed cookie', async ({ page, context }) => {
  let rotating = false, attempts = 0;
  await page.route('**/api/session', route => {
    if (rotating && attempts++ === 0) return route.fulfill({ status: 409, json: { error: 'session_rotating' } });
    return route.continue();
  });
  await page.goto('/dashboard/connection');
  await expect(page.getByRole('button', { name: 'Save commands', exact: true })).toBeEnabled();
  const view = await (await context.request.get('/api/session')).json() as SessionView;
  rotating = true;
  const disconnected = await context.request.post('/api/twitch/disconnect', { headers: { Origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000', 'X-CSRF-Token': view.csrfToken }, data: {} });
  expect(disconnected.ok()).toBe(true);
  await expect(page.getByText('Twitch is disconnected. Authorize again whenever you’re ready.', { exact: true })).toBeVisible();
  await expect.poll(() => attempts).toBeGreaterThanOrEqual(2);
  const started = page.waitForResponse(response => new URL(response.url()).pathname === '/api/simulation/start');
  await page.getByRole('button', { name: 'Run local simulation', exact: true }).click();
  expect((await started).status()).toBe(200);
  await expect(page.locator('.workspace-topbar .status')).toHaveText('Simulation mode');
});

test('a delayed action cannot restore pre-rotation CSRF after a fresh session bootstrap', async ({ page, context }) => {
  let release!: () => void, arrived!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const responseArrived = new Promise<void>(resolve => { arrived = resolve; });
  await page.route('**/api/commands', async route => { const response = await route.fetch(); arrived(); await held; await route.fulfill({ response }); });
  try {
    await page.goto('/dashboard/connection'); await expect(page.getByRole('button', { name: 'Save commands', exact: true })).toBeEnabled();
    await page.getByLabel('Team A · Coral').fill('!torch'); await page.getByLabel('Team B · Mint').fill('!shield');
    await page.getByRole('button', { name: 'Save commands', exact: true }).click(); await responseArrived;
    const view = await (await context.request.get('/api/session')).json() as SessionView;
    const bootstrap = page.waitForResponse(async response => new URL(response.url()).pathname === '/api/session' && (await response.json() as SessionView).csrfToken !== view.csrfToken);
    const disconnected = await context.request.post('/api/twitch/disconnect', { headers: { Origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000', 'X-CSRF-Token': view.csrfToken }, data: {} });
    expect(disconnected.ok()).toBe(true); await bootstrap;
    await expect(page.getByText('Twitch is disconnected. Authorize again whenever you’re ready.', { exact: true })).toBeVisible();
    release(); await expect(page.getByRole('status').filter({ hasText: 'Team commands saved' })).toBeVisible();
    const started = page.waitForResponse(response => new URL(response.url()).pathname === '/api/simulation/start');
    await page.getByRole('button', { name: 'Run local simulation', exact: true }).click();
    expect((await started).status()).toBe(200);
    await expect(page.locator('.workspace-topbar .status')).toHaveText('Simulation mode');
    await mkdir('docs/qa/phase7/regression', { recursive: true });
    await page.screenshot({ path: 'docs/qa/phase7/regression/session-rotation-recovery.png' });
  } finally { release(); }
});

test('configured HTML remains literal text in the dashboard and read-only overlay', async ({ page, context, browser }) => {
  const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
  const question = '<img src=x onerror=alert(1)>?', choice = '<svg/onload=alert()>';
  const read = async () => await (await context.request.get('/api/session')).json() as SessionView;
  let state = await read();
  const configure = await context.request.post('/api/game/configure', { headers: { Origin: origin, 'X-CSRF-Token': state.csrfToken }, data: { roundId: state.snapshot.game!.roundId, expectedState: state.snapshot.game!.state, settingsRevision: state.snapshot.showdown!.settingsRevision, config: { ...DEFAULT_SHOWDOWN, title: question, coralName: choice }, commands: { coral: '!coral', mint: '!mint' } } });
  expect(configure.status()).toBe(200); state = await configure.json() as SessionView;
  const rehearse = await context.request.post('/api/game/rehearse', { headers: { Origin: origin, 'X-CSRF-Token': state.csrfToken }, data: { roundId: state.snapshot.game!.roundId, expectedState: state.snapshot.game!.state } });
  expect(rehearse.status()).toBe(200);
  await page.goto('/dashboard'); await expect(page.getByText(question, { exact: true }).first()).toBeVisible();
  expect(await page.locator('img[src="x"], svg[onload]').count()).toBe(0);
  const { key } = await (await context.request.get('/api/game/overlay-key')).json() as { key: string };
  const viewer = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    const overlay = await viewer.newPage(); await overlay.goto(`${origin}/overlay#room=${key}`);
    await expect(overlay.getByText(question, { exact: true })).toBeVisible();
    await expect(overlay.getByText(choice, { exact: true })).toBeVisible();
    expect(await overlay.locator('img[src="x"], svg[onload]').count()).toBe(0);
    await expect(overlay.getByRole('button')).toHaveCount(0);
    expect((await viewer.cookies()).filter(cookie => cookie.name === 'cta_session')).toEqual([]);
    await overlay.screenshot({ path: 'docs/qa/phase7/regression/literal-text-overlay-1280.png', omitBackground: true });
  } finally { await viewer.close(); }
});
