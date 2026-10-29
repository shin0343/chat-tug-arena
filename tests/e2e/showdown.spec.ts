import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { DEFAULT_SHOWDOWN } from '../../packages/contracts/src/index';
import { sceneAction, sceneSession, sceneSource } from '../helpers/scene-browser';

const qa = 'docs/qa/phase7/regression';
test.beforeAll(async () => { await mkdir(`${qa}/motion`, { recursive: true }); });
async function shot(page: Page, name: string, fullPage = true) { await page.evaluate(() => { scrollTo(0, 0); return document.fonts.ready; }); await page.screenshot({ path: `${qa}/${name}.png`, fullPage }); }
async function save(page: Page, check = false) {
  await page.goto('/dashboard/round'); await expect(page.getByRole('button', { name: 'Save showdown', exact: true })).toBeEnabled();
  await page.getByLabel('Coral keyword', { exact: true }).fill('!mage'); await page.getByLabel('Mint keyword', { exact: true }).fill('!knight');
  if (check) await page.getByLabel('Before starting', { exact: true }).selectOption('chat_ready');
  await page.getByRole('button', { name: 'Save showdown', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Showdown saved for this session.');
}
async function rehearse(page: Page) {
  await page.goto('/dashboard'); await page.getByRole('button', { name: 'Rehearse this showdown', exact: true }).click(); await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'READY');
}

test('complete streamer journey uses actual server results, commitment, history and a separate public overlay', async ({ browser, baseURL }) => {
  const control = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, recordVideo: { dir: `${qa}/motion/raw`, size: { width: 1280, height: 890 } } });
  const viewer = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 }, recordVideo: { dir: `${qa}/motion/raw`, size: { width: 1280, height: 720 } } });
  const page = await control.newPage(), overlay = await viewer.newPage(); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); overlay.on('pageerror', error => errors.push(error.message));
  // Full-page capture can temporarily resize Chromium's screencast; keep the recorded journey at its real viewport.
  const capture = (name: string) => shot(page, name, false);
  try {
    await page.goto('/dashboard'); await expect(page.getByRole('link', { name: 'Create a showdown', exact: true })).toBeVisible(); await capture('empty-desktop');
    await save(page); await capture('configuration-desktop'); await sceneSource(control, overlay);
    await rehearse(page); await capture('ready-desktop'); await page.getByRole('button', { name: 'Start showdown', exact: true }).click();
    const embedded = page.frameLocator('.compact-overlay .source-iframe'); await expect(embedded.locator('.yard-question')).toContainText('Which character should I use next?');
    await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'COUNTDOWN'); await capture('countdown-desktop');
    await expect(page.locator('.insight-combo[data-active="true"]').first()).toBeVisible({ timeout: 7000 }); await capture('active-combo-desktop');
    await expect(page.getByRole('button', { name: 'Commit to this choice', exact: true })).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.consequence-summary')).toHaveText('Chat chose Mage for the next match.'); await expect(page.getByRole('button', { name: 'Rematch', exact: true })).toBeDisabled();
    await expect(overlay.locator('.yard-consequence-copy')).toContainText('Play as Mage in the next match.'); await expect(overlay.locator('.broadcast-field')).toHaveAttribute('data-result-ready', 'true');
    await expect(embedded.locator('.yard-consequence-copy')).toContainText('Play as Mage in the next match.');
    await capture('result-desktop'); await overlay.screenshot({ path: `${qa}/result-overlay-1920.png`, omitBackground: true });
    expect((await viewer.cookies()).length).toBe(0); await expect(overlay.getByRole('button')).toHaveCount(0);
    await page.getByRole('button', { name: 'Commit to this choice', exact: true }).click(); await expect(page.locator('.commit-status')).toContainText('Committed to this choice.');
    await expect(overlay.locator('.yard-consequence-copy')).toContainText('Streamer committed: Play as Mage in the next match.'); await capture('committed-desktop'); await overlay.screenshot({ path: `${qa}/committed-overlay-1920.png`, omitBackground: true });
    const first = await sceneSession(control); expect(first.snapshot.showdown?.current?.committedAt).toBeTruthy();
    await page.reload(); await expect(page.locator('.commit-status')).toBeVisible(); await page.getByRole('button', { name: 'Rematch', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start showdown', exact: true })).toBeEnabled(); const second = await sceneSession(control); expect(second.snapshot.game?.roundId).not.toBe(first.snapshot.game?.roundId); expect(second.snapshot.game?.uniqueViewers).toBe(0);
    await page.getByRole('button', { name: 'Start showdown', exact: true }).click(); await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'COUNTDOWN');
    await page.getByRole('button', { name: 'Cancel showdown', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Cancel showdown', exact: true }).click(); await expect(page.locator('.consequence-summary')).toContainText('No choice was made.');
    await page.getByRole('link', { name: 'Round history', exact: true }).click(); await expect(page.locator('.showdown-history li')).toHaveCount(2); await expect(page.locator('.showdown-history')).toContainText('Committed'); await capture('history-desktop');
    expect(errors).toEqual([]);
  } finally { const a = page.video(), b = overlay.video(); await control.close(); await viewer.close(); await a?.saveAs(`${qa}/motion/streamer-journey.webm`); await b?.saveAs(`${qa}/motion/consequence-overlay.webm`); }
});

test('pause, resume, manual finish and reset are confirmed; native dialog traps focus and restores it', async ({ page, context }) => {
  await save(page); await rehearse(page); await page.getByRole('button', { name: 'Start showdown', exact: true }).click();
  await expect.poll(async () => (await sceneSession(context)).snapshot.game!.position).toBeLessThan(-0.05);
  await page.getByRole('button', { name: 'Pause round', exact: true }).click(); await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'PAUSED'); const before = await sceneSession(context); await page.waitForTimeout(250); expect((await sceneSession(context)).snapshot.game?.position).toBe(before.snapshot.game?.position); await shot(page, 'paused-desktop');
  const finish = page.getByRole('button', { name: 'Finish now', exact: true }); await finish.click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog.getByRole('button', { name: 'Keep the round' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Finalize result' })).toBeFocused(); await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Keep the round' })).toBeFocused(); await shot(page, 'finish-confirmation-desktop', false);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(finish).toBeFocused();
  await page.getByRole('button', { name: 'Resume round', exact: true }).click(); await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'ACTIVE'); await page.getByRole('button', { name: 'Pause round', exact: true }).click();
  await finish.click(); await dialog.getByRole('button', { name: 'Finalize result' }).click(); await expect(page.locator('.consequence-summary')).toContainText('Mage'); expect((await sceneSession(context)).snapshot.game?.result?.reason).toBe('manual');
  await page.getByRole('button', { name: 'Commit to this choice', exact: true }).click(); await page.getByRole('button', { name: 'Reset round', exact: true }).click(); await dialog.getByRole('button', { name: 'Reset arena', exact: true }).click(); await expect(page.locator('.showdown-history li')).toHaveCount(1); expect((await sceneSession(context)).snapshot.game?.state).toBe('IDLE');
});

test('configuration errors keep edits, focus the invalid field and recover after a failed save', async ({ page }) => {
  await page.goto('/dashboard/round'); await expect(page.getByRole('button', { name: 'Save showdown', exact: true })).toBeEnabled();
  await page.getByLabel('Coral keyword', { exact: true }).fill('!same'); await page.getByLabel('Mint keyword', { exact: true }).fill('!SAME'); await page.getByRole('button', { name: 'Save showdown', exact: true }).click(); await expect(page.getByLabel('Mint keyword', { exact: true })).toBeFocused();
  await page.getByLabel('Mint keyword', { exact: true }).fill('!other'); await page.getByLabel('Consequence', { exact: true }).selectOption('custom'); await page.getByRole('button', { name: 'Save showdown', exact: true }).click(); await expect(page.locator('#coralAction')).toBeFocused(); await shot(page, 'validation-desktop');
  await page.locator('#coralAction').fill('Use a starter wand in the next match.'); await page.locator('#mintAction').fill('Use a starter shield in the next match.');
  await page.route('**/api/game/configure', route => route.abort()); await page.getByRole('button', { name: 'Save showdown', exact: true }).click(); await expect(page.getByRole('main').getByRole('alert')).toContainText('could not be confirmed'); await expect(page.locator('#coralAction')).toHaveValue('Use a starter wand in the next match.'); await shot(page, 'save-error-desktop');
  await page.unroute('**/api/game/configure'); await page.getByRole('button', { name: 'Save showdown', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Showdown saved for this session.');
});

test('a stale settings tab retains its draft and cannot silently overwrite a newer save', async ({ page, context }) => {
  await page.goto('/dashboard/round'); await expect(page.getByRole('button', { name: 'Save showdown', exact: true })).toBeEnabled(); await page.getByLabel('Showdown question').fill('My unsaved choice?');
  const other = await context.newPage(); try { await other.goto('/dashboard/round'); await expect(other.getByRole('button', { name: 'Save showdown', exact: true })).toBeEnabled(); await other.getByLabel('Showdown question').fill('The saved question?'); await other.getByRole('button', { name: 'Save showdown', exact: true }).click(); await expect(other.getByRole('status')).toContainText('Showdown saved for this session.');
    await expect(page.getByRole('button', { name: 'Load saved settings', exact: true })).toBeVisible(); await expect(page.getByLabel('Showdown question')).toHaveValue('My unsaved choice?'); await expect(page.getByRole('button', { name: 'Save showdown', exact: true })).toBeDisabled(); await shot(page, 'settings-conflict-desktop');
    await page.getByRole('button', { name: 'Load saved settings', exact: true }).click(); await expect(page.getByLabel('Showdown question')).toHaveValue('The saved question?');
  } finally { await other.close(); }
});

test('a fresh-command start condition and reduced-motion feedback work without starting early', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await save(page, true); await rehearse(page); await expect(page.getByRole('button', { name: 'Start showdown', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Send rehearsal check', exact: true }).click(); await expect(page.getByRole('button', { name: 'Start showdown', exact: true })).toBeEnabled(); expect((await sceneSession(context)).snapshot.game?.state).toBe('READY'); expect((await sceneSession(context)).snapshot.game?.uniqueViewers).toBe(0); await expect(page.locator('.action-feedback')).toHaveCSS('animation-duration', '0s'); await shot(page, 'start-check-reduced-motion');
  await page.getByRole('button', { name: 'Start showdown', exact: true }).click(); await page.getByRole('button', { name: 'Pause round', exact: true }).click(); await expect(page.getByRole('button', { name: 'Finish now', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel showdown', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Cancel showdown', exact: true }).click(); await expect(page.locator('.consequence-summary')).toContainText('No choice was made.'); await expect(page.getByRole('button', { name: 'Commit to this choice', exact: true })).toHaveCount(0);
});

test('maximum choices, keywords and consequences fit desktop, mobile and the actual overlay', async ({ page, context, browser, baseURL }) => {
  await sceneAction(context, 'configure', { settingsRevision: 0, config: { ...DEFAULT_SHOWDOWN, title: 'Q'.repeat(60), coralName: 'C'.repeat(20), mintName: 'M'.repeat(20), consequenceType: 'custom', coralAction: 'Use only the starter equipment for the next match. '.repeat(2).trim(), mintAction: 'Try the other strategy in the next match.' }, commands: { coral: '!abcdefghijklmnopqrst', mint: '!uvwxyzabcdefghijklmn' } });
  await rehearse(page); await page.getByRole('button', { name: 'Start showdown', exact: true }).click(); await expect.poll(async () => (await sceneSession(context)).snapshot.game!.position).toBeLessThan(-0.05); await page.getByRole('button', { name: 'Pause round', exact: true }).click();
  for (const [width, height] of [[1440, 1000], [1024, 768], [768, 1024], [390, 844], [320, 844]]) { await page.setViewportSize({ width: width!, height: height! }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width!); await expect(page.getByRole('button', { name: 'Resume round', exact: true })).toBeInViewport(); await shot(page, `paused-${width}`); }
  await sceneAction(context, 'finish'); await expect(page.locator('.consequence-action')).toContainText('Use only the starter equipment'); await shot(page, 'result-320');
  const viewer = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 } }); const overlay = await viewer.newPage(); try {
    await sceneSource(context, overlay); await expect(overlay.locator('.yard-consequence-copy')).toContainText('Use only the starter equipment');
    for (const width of [1920, 1280, 960]) { await overlay.setViewportSize({ width, height: width * 9 / 16 }); const bounds = await overlay.locator('.yard-consequence-copy').boundingBox(); expect(bounds!.x).toBeGreaterThan(0); expect(bounds!.x + bounds!.width).toBeLessThan(width); expect(await overlay.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width); const actionSize = await overlay.locator('.yard-consequence-copy > strong').evaluate(node => parseFloat(getComputedStyle(node).fontSize)); expect(actionSize).toBeGreaterThanOrEqual(width / 80); await overlay.screenshot({ path: `${qa}/long-consequence-overlay-${width}.png`, omitBackground: true }); }
  } finally { await viewer.close(); }
});

test('losing dashboard transport disables controls, hides the clock and recovers current authority', async ({ page, context }) => {
  await save(page); await rehearse(page); await page.getByRole('button', { name: 'Start showdown', exact: true }).click(); await expect(page.locator('.authoritative-arena')).toHaveAttribute('data-state', 'ACTIVE', { timeout: 6000 });
  await context.setOffline(true); await expect(page.locator('.workspace-topbar .status')).toHaveText('Updates unavailable'); await expect(page.getByRole('button', { name: 'Pause round', exact: true })).toBeDisabled(); await expect(page.getByTestId('match-clock')).toHaveText('--:--'); await shot(page, 'connection-interruption-desktop');
  await context.setOffline(false); await expect(page.locator('.workspace-topbar .status')).toHaveText('Simulation mode'); const current = await sceneSession(context); expect(current.snapshot.game?.source).toBe('simulation'); expect(current.snapshot.showdown?.configured).toBe(true);
});
