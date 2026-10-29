import { expect, test } from '@playwright/test';
import { DEFAULT_CONFIG } from '../../packages/contracts/src/index';
import { sceneAction, sceneSession, sceneSource, startScene, waitGame } from '../helpers/scene-browser';

test('OBS canvas scales as 16:9 with safe labels, max commands and no clipped characters', async ({ context, page }) => {
  const initial = await sceneSession(context);
  expect((await context.request.post('/api/commands', { headers: { Origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000', 'X-CSRF-Token': initial.csrfToken }, data: { coral: '!abcdefghijklmnopqrst', mint: '!uvwxyzabcdefghijklmn' } })).ok()).toBe(true);
  await startScene(context, 'quiet', { ...DEFAULT_CONFIG, coralName: 'MMMMMMMMMMMMMMMMMMMM', mintName: 'WWWWWWWWWWWWWWWWWWWW' });
  await sceneSource(context, page); await waitGame(page, 'ACTIVE');
  for (const [width, height] of [[1920, 1080], [1280, 720], [960, 540], [640, 360], [390, 844]]) {
    await page.setViewportSize({ width: width!, height: height! });
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('.broadcast-canvas')!.getBoundingClientRect();
      return { width: innerWidth, scroll: document.documentElement.scrollWidth, aspect: canvas.width / canvas.height, left: canvas.left, right: canvas.right, labels: Array.from(document.querySelectorAll('.broadcast-team h1,.broadcast-team h2,.broadcast-team code')).map(node => { const range = document.createRange(); range.selectNodeContents(node); const rect = range.getBoundingClientRect(); const parent = node.closest('.broadcast-team')!.getBoundingClientRect(); return { left: rect.left, right: rect.right, parentLeft: parent.left, parentRight: parent.right }; }) };
    });
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width); expect(geometry.aspect).toBeCloseTo(16 / 9, 3);
    for (const label of geometry.labels) { expect(label.left).toBeGreaterThanOrEqual(label.parentLeft - 1); expect(label.right).toBeLessThanOrEqual(label.parentRight + 1); }
    expect(await page.locator('.yard-crew').count()).toBeLessThanOrEqual(10);
  }
  await sceneAction(context, 'abandon');
});

test('a real distinct-user combo synchronizes connected poses; pause and reduced motion stop animation loops', async ({ context, page }) => {
  await startScene(context); await sceneSource(context, page); await waitGame(page, 'ACTIVE');
  await sceneAction(context, 'test-input', { team: 'coral', count: 3, viewer: 'coral' }); await sceneAction(context, 'test-input', { team: 'mint', count: 3, viewer: 'mint' });
  await expect(page.locator('.yard-crew[data-animation="combo"]')).toHaveCount(6);
  const motion = await page.evaluate(async () => {
    const shirts: string[] = [];
    for (let n = 0; n < 12; n++) { await new Promise(requestAnimationFrame); shirts.push(document.querySelector('.yard-crew [data-part="shirt"]')!.getAttribute('d')!); }
    const coral = Array.from(document.querySelectorAll('.yard-crew[data-team="coral"] [data-part="shirt"]')).map(p => p.getAttribute('d'));
    return { distinct: new Set(shirts).size, synchronized: new Set(coral).size };
  });
  expect(motion.distinct).toBeGreaterThan(3); expect(motion.synchronized).toBe(1);
  await sceneAction(context, 'pause'); await waitGame(page, 'PAUSED');
  const frozen = await page.locator('.yard-crew [data-part="shirt"]').first().getAttribute('d'); await page.waitForTimeout(250);
  expect(await page.locator('.yard-crew [data-part="shirt"]').first().getAttribute('d')).toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await sceneAction(context, 'resume'); await waitGame(page, 'ACTIVE');
  await page.evaluate(() => { const original = window.requestAnimationFrame; Object.assign(window, { animationRequests: 0 }); window.requestAnimationFrame = callback => { (window as unknown as { animationRequests: number }).animationRequests++; return original.call(window, callback); }; });
  await page.waitForTimeout(300); expect(await page.evaluate(() => (window as unknown as { animationRequests: number }).animationRequests)).toBeLessThanOrEqual(2);
  await sceneAction(context, 'abandon');
});

test('server victory produces one bounded celebration, grounded defeat and a settled result on reload', async ({ context, page }) => {
  await startScene(context, 'early_blowout'); await sceneSource(context, page); await waitGame(page, 'FINISHED', 12000);
  await expect(page.locator('.yard-crew[data-team="coral"][data-animation="victory"]')).toHaveCount(5);
  await expect(page.locator('.yard-crew[data-team="mint"][data-animation="defeat"]')).toHaveCount(2);
  await expect(page.locator('.broadcast-field')).toHaveAttribute('data-result-ready', 'true', { timeout: 2500 });
  await expect(page.locator('.yard-result-title')).toHaveText('Coral crew'); await expect(page.locator('.yard-result-title')).toBeVisible(); await expect(page.getByText('Finish line reached. The other crew takes a seat.')).toBeVisible();
  const result = (await sceneSession(context)).snapshot.game!.result; expect(result).toMatchObject({ winner: 'coral', finalPosition: -1 });
  await page.reload(); await expect(page.locator('.broadcast-field')).toHaveAttribute('data-result-ready', 'true', { timeout: 3000 });
  expect((await sceneSession(context)).snapshot.game!.result).toEqual(result);
});

test('transport interruption freezes art, reconnects to authority and does not replay old combos', async ({ context, page }) => {
  await startScene(context); await sceneSource(context, page); await waitGame(page, 'ACTIVE');
  await sceneAction(context, 'test-input', { team: 'mint', count: 3, viewer: 'mint' }); await sceneAction(context, 'pause'); await waitGame(page, 'PAUSED');
  await context.setOffline(true); await expect(page.getByText('Arena updates unavailable', { exact: true })).toBeVisible();
  const frozen = await page.locator('.yard-assembly').getAttribute('transform'); await page.waitForTimeout(400); expect(await page.locator('.yard-assembly').getAttribute('transform')).toBe(frozen);
  await context.setOffline(false); await expect(page.getByText('Paused', { exact: true })).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.broadcast-field')).toHaveAttribute('data-state', 'PAUSED');
  expect(await page.locator('.broadcast-field').evaluate(node => node.style.getPropertyValue('--mint-pulse'))).toBe('0');
  await sceneAction(context, 'abandon');
});
