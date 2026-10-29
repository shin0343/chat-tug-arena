import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { DEFAULT_SHOWDOWN } from '../../packages/contracts/src/index';
import { sceneAction, sceneSession, sceneSource, waitGame } from '../helpers/scene-browser';

const qa = 'docs/qa/phase7/regression';
test.beforeAll(async () => { await mkdir(qa, { recursive: true }); });

test('small-screen navigation is disclosed, keyboard operable and closes after choosing a task', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('/dashboard/round');
    const navigation = page.getByRole('navigation', { name: 'Streamer navigation' });
    const toggle = page.getByRole('button', { name: 'Open navigation' });
    await expect(navigation).not.toBeVisible(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(navigation).toBeVisible();
    await page.keyboard.press('Tab'); await expect(navigation.getByRole('link', { name: 'Control room', exact: true })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(navigation).not.toBeVisible(); await expect(toggle).toBeFocused();
    await toggle.click(); await navigation.getByRole('link', { name: 'OBS overlay', exact: true }).click();
    await expect(page).toHaveURL(/dashboard\/overlay$/); await expect(navigation).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy arena source URL', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `${qa}/navigation-and-obs-${width}.png` });
  }
});

test('the real thumbnail keeps the broadcast proportions and idle origin is labeled Standby', async ({ page, context, browser, baseURL }) => {
  await page.goto('/dashboard');
  const thumbnail = page.frameLocator('.compact-overlay .source-iframe');
  await expect(thumbnail.locator('.broadcast-field')).toHaveAttribute('data-connection', 'current');
  await expect(thumbnail.locator('.broadcast-preview-label')).toContainText('Standby overlay preview');
  await thumbnail.locator('.broadcast-canvas').evaluate(() => document.fonts.ready);
  const compact = await thumbnail.locator('.broadcast-canvas').evaluate(node => {
    const canvas = node.getBoundingClientRect(), board = node.querySelector('.broadcast-scoreboard')!.getBoundingClientRect();
    return { width: canvas.width, ratio: board.height / canvas.width };
  });
  const viewer = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 } });
  try {
    const overlay = await viewer.newPage(); await sceneSource(context, overlay); await overlay.evaluate(() => document.fonts.ready);
    const ratio = await overlay.locator('.broadcast-canvas').evaluate(node => node.querySelector('.broadcast-scoreboard')!.getBoundingClientRect().height / node.getBoundingClientRect().width);
    expect(compact.width).toBeLessThan(250); expect(Math.abs(compact.ratio - ratio)).toBeLessThan(0.008);
    await page.screenshot({ path: `${qa}/thumbnail-proportions.png` });
  } finally { await viewer.close(); }
});

test('the source names the server winning choice and fits maximum-length names at broadcast sizes', async ({ page, context }) => {
  const choice = 'W'.repeat(20);
  await sceneAction(context, 'configure', { settingsRevision: 0, config: { ...DEFAULT_SHOWDOWN, coralName: choice }, commands: { coral: '!mage', mint: '!knight' } });
  await sceneAction(context, 'rehearse'); await sceneAction(context, 'start'); await sceneSource(context, page); await waitGame(page, 'FINISHED', 12000);
  await expect(page.locator('.broadcast-field')).toHaveAttribute('data-result-ready', 'true');
  const result = (await sceneSession(context)).snapshot.game!.result;
  for (const width of [1920, 1280, 960]) {
    await page.setViewportSize({ width, height: width * 9 / 16 });
    const title = page.locator('.yard-result-title'); await expect(title).toHaveText(choice); await expect(title).toBeVisible();
    const bounds = await title.evaluate(node => { const range = document.createRange(); range.selectNodeContents(node); const text = range.getBoundingClientRect(), parent = node.closest('.broadcast-clock')!.getBoundingClientRect(); return { left: text.left, right: text.right, parentLeft: parent.left, parentRight: parent.right, font: parseFloat(getComputedStyle(node).fontSize) }; });
    expect(bounds.left).toBeGreaterThanOrEqual(bounds.parentLeft); expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight);
    expect(bounds.font).toBeGreaterThanOrEqual(width / 55);
    await page.screenshot({ path: `${qa}/long-winner-${width}.png`, omitBackground: true });
  }
  await page.reload(); await expect(page.locator('.yard-result-title')).toHaveText(choice); expect((await sceneSession(context)).snapshot.game!.result).toEqual(result);
});

test('source failure replaces loading copy and actual clipboard success is confirmed beside OBS instructions', async ({ page, context }) => {
  await page.route('**/api/game/overlay-key', route => route.fulfill({ status: 503, json: { error: 'source_unavailable' } }));
  await page.goto('/dashboard'); await expect(page.locator('.compact-overlay')).toContainText('Source unavailable. Open OBS setup to retry.');
  await expect(page.locator('.compact-overlay')).not.toContainText('Preparing');
  await page.screenshot({ path: `${qa}/preview-error.png` });
  await page.unroute('**/api/game/overlay-key'); await page.getByRole('link', { name: 'Set up OBS overlay', exact: true }).click();
  await context.grantPermissions(['clipboard-write']); await expect(page.getByRole('button', { name: 'Copy arena source URL', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Copy arena source URL', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Arena source URL copied.');
  await expect(page.getByLabel('Read-only overlay URL')).toHaveAttribute('type', 'password');
});
