import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { SessionView } from '../../packages/contracts/src/index';
const qaPath = 'docs/qa/phase7/regression';
test.beforeAll(async () => { await mkdir(qaPath, { recursive: true }); });

test('real server mechanics, fairness, pause/resume and a cookie-free read-only overlay stay synchronized', async ({ page, browser }) => {
  await page.goto('/dashboard/mechanics');
  await expect(page.getByRole('button', { name: 'Run scenario' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run scenario' }).click();
  await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'COUNTDOWN');
  await expect(page.getByRole('button', { name: 'Pull for Coral' })).toBeEnabled({ timeout: 6000 });
  await page.getByLabel('Participants per pull').selectOption('3'); await page.getByRole('button', { name: 'Pull for Coral' }).click();
  await expect(page.getByTestId('coral-combo')).toContainText('Level 1');
  await expect.poll(async () => Number(await page.getByTestId('rope-position').textContent())).toBeLessThan(0);
  await page.getByRole('button', { name: 'Pull for Coral' }).click();
  await page.getByRole('button', { name: 'Pull for Mint' }).click();
  const decisions = await (await page.request.get('/api/session')).json() as SessionView;
  expect(decisions.snapshot.game!.uniqueViewers).toBe(3); expect(decisions.snapshot.game!.diagnostics.reasons.cooldown).toBeGreaterThanOrEqual(3); expect(decisions.snapshot.game!.diagnostics.reasons.team_locked).toBe(3);
  await page.getByRole('button', { name: 'Pause round' }).click();
  await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'PAUSED');
  const position = await page.getByTestId('rope-position').textContent(); const clock = await page.getByTestId('match-clock').textContent();
  await page.waitForTimeout(400); await expect(page.getByTestId('rope-position')).toHaveText(position!); await expect(page.getByTestId('match-clock')).toHaveText(clock!);
  const { key } = await (await page.request.get('/api/game/overlay-key')).json() as { key: string };
  const viewerContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const overlay = await viewerContext.newPage();
  try {
    const requests: string[] = []; overlay.on('request', request => requests.push(request.url()));
    await overlay.goto(`${new URL(page.url()).origin}/overlay#room=${key}`); await expect(overlay.getByText('Simulation round · 3 participants')).toBeVisible();
    await expect(overlay.locator('.broadcast-field')).toHaveAttribute('data-state', 'PAUSED');
    await expect(overlay.getByRole('button')).toHaveCount(0); expect((await viewerContext.cookies()).length).toBe(0);
    expect(requests.every(url => !url.includes(key))).toBe(true);
    await overlay.screenshot({ path: `${qaPath}/overlay-simulation-transparent.png`, omitBackground: true });
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${qaPath}/mechanics-paused-desktop.png`, fullPage: true });
    await page.getByRole('button', { name: 'Resume round' }).click(); await expect(overlay.locator('.broadcast-field')).toHaveAttribute('data-state', 'ACTIVE');
    await page.getByRole('button', { name: 'Abandon round' }).click(); await expect(overlay.getByText('Round abandoned', { exact: true })).toBeVisible();
  } finally { await viewerContext.close(); }
});

test('a scenario finishes on server authority, exposes a result, and rematches without carrying inputs', async ({ page }) => {
  await page.goto('/dashboard/mechanics'); await expect(page.getByRole('button', { name: 'Run scenario' })).toBeEnabled();
  await page.getByLabel('Scenario', { exact: true }).selectOption('early_blowout'); await page.getByRole('button', { name: 'Run scenario' }).click();
  await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'FINISHED', { timeout: 12_000 });
  await expect(page.locator('.game-state-line')).toContainText('Coral crew wins');
  const first = await (await page.request.get('/api/session')).json() as SessionView;
  expect(first.snapshot.game!.result).toMatchObject({ winner: 'coral', reason: 'endpoint', finalPosition: -1 });
  await page.screenshot({ path: `${qaPath}/mechanics-finished-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Rematch' }).click(); const next = await (await page.request.get('/api/session')).json() as SessionView;
  expect(next.snapshot.game!.roundId).not.toBe(first.snapshot.game!.roundId); expect(next.snapshot.game!.uniqueViewers).toBe(0); expect(next.snapshot.game!.result).toBeNull();
  await page.getByRole('button', { name: 'Abandon round' }).click(); await page.getByRole('button', { name: 'Reset round' }).click();
  await expect(page.getByRole('button', { name: 'Run scenario' })).toBeEnabled(); await expect(page.getByTestId('rope-position')).toHaveText('0.0000');
});

test('mechanics view stays within small and desktop viewports with visible controls and labels', async ({ page }) => {
  await page.goto('/dashboard/mechanics'); await expect(page.getByRole('button', { name: 'Run scenario' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run scenario' }).click(); await expect(page.getByRole('button', { name: 'Pull for Mint' })).toBeEnabled({ timeout: 6000 });
  await page.getByLabel('Participants per pull').selectOption('6'); await page.getByRole('button', { name: 'Pull for Mint' }).click(); await page.getByRole('button', { name: 'Pause round' }).click();
  for (const [width, height] of [[1440, 1000], [1024, 768], [768, 1024], [390, 844], [320, 844]]) {
    await page.setViewportSize({ width: width!, height: height! }); await page.evaluate(() => scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width!);
    for (const label of ['Scenario', 'Seed', 'Viewer identity', 'Participants per pull']) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume round' })).toBeEnabled();
    await page.screenshot({ path: `${qaPath}/mechanics-${width}.png`, fullPage: true });
  }
});

test('lost overlay updates freeze the drawing, remove the clock and explain the interruption', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/dashboard/overlay'); await page.getByRole('button', { name: 'Copy arena source URL' }).click();
  await expect(page.getByRole('status')).toContainText('Arena source URL copied.');
  const url = await page.evaluate(() => navigator.clipboard.readText()); expect(url).toMatch(/\/overlay#room=[\w-]{43}$/);
  await page.route('**/api/overlay/events', route => route.abort()); await page.goto(url);
  await expect(page.getByText('Arena updates unavailable', { exact: true })).toBeVisible(); await expect(page.getByText('--:--', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${qaPath}/overlay-updates-unavailable.png`, omitBackground: true });
});

test('mechanics keyboard controls and reduced motion work without browser errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard/mechanics'); await page.getByLabel('Scenario', { exact: true }).focus(); await page.keyboard.press('Home');
  await page.getByLabel('Scenario', { exact: true }).selectOption('quiet'); await page.getByLabel('Seed').fill('7');
  await page.getByRole('button', { name: 'Run scenario' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pull for Coral' })).toBeEnabled({ timeout: 6000 }); await page.getByRole('button', { name: 'Pull for Coral' }).click();
  await expect(page.locator('.pulling-group')).toHaveCSS('transition-duration', '0s');
  await page.getByRole('button', { name: 'Pause round' }).click(); expect(errors).toEqual([]);
});
