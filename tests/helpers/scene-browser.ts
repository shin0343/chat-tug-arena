import { expect, type BrowserContext, type Page } from '@playwright/test';
import { DEFAULT_CONFIG, type SessionView, type RoundConfig, type GameScenario, type GameSnapshot } from '../../packages/contracts/src/index';

export async function sceneSession(context: BrowserContext): Promise<SessionView> { const response = await context.request.get('/api/session'); expect(response.ok()).toBe(true); return await response.json() as SessionView; }
export async function sceneAction(context: BrowserContext, name: string, payload: object = {}) {
  const view = await sceneSession(context); const game = view.snapshot.game!;
  const response = await context.request.post(`/api/game/${name}`, { headers: { Origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000', 'X-CSRF-Token': view.csrfToken }, data: { roundId: game.roundId, expectedState: game.state, ...payload } });
  expect(response.ok(), `${name}: ${response.status()}`).toBe(true); return await response.json() as SessionView;
}
export async function startScene(context: BrowserContext, scenario: GameScenario = 'quiet', config: RoundConfig = DEFAULT_CONFIG) { return sceneAction(context, 'simulate', { scenario, seed: 42, config }); }
export async function sceneSource(control: BrowserContext, page: Page) {
  const response = await control.request.get('/api/game/overlay-key'); const { key } = await response.json() as { key: string };
  await page.goto(`/overlay#room=${key}`); await expect(page.locator('.game-art')).toBeVisible();
}
export async function waitGame(page: Page, state: GameSnapshot['state'], timeout = 6000) { await expect(page.locator('.broadcast-field')).toHaveAttribute('data-state', state, { timeout }); }
