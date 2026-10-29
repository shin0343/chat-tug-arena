import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { CONNECTION_STATES, DEFAULT_KEYWORDS, EMPTY_COUNTERS, type ConnectionSnapshot, type ConnectionState } from "../../packages/contracts/src/index";
const qaPath = "docs/qa/phase7/regression";
test.beforeAll(async () => { await mkdir(qaPath, { recursive: true }); });

test("actual Node simulation arrives through SSE, including a gap, and survives navigation", async ({ page }) => {
  await page.goto("/dashboard/connection");
  await expect(page.getByRole("button", { name: "Run local simulation" })).toBeEnabled();
  await page.getByLabel("Team A · Coral").fill("!tea"); await page.getByLabel("Team B · Mint").fill("!coffee");
  await page.getByRole("button", { name: "Save commands" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Team commands saved" })).toBeVisible();
  await page.getByRole("button", { name: "Run local simulation" }).click();
  await expect(page.getByRole("list", { name: "Recognized team inputs" }).getByText("!tea", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Simulated connection lost", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${qaPath}/simulation-gap-desktop.png`, fullPage: true });
  await expect(page.getByText("Sequence complete", { exact: true })).toBeVisible();
  await expect(page.locator(".pipeline-diagnostics")).toContainText("10 recognized · 3 ignored · 1 duplicates rejected · 1 invalid");
  await expect(page.getByText("Simulation only", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${qaPath}/simulation-complete-desktop.png`, fullPage: true });
  const evidence = await page.request.get("/api/evidence"); expect(evidence.status()).toBe(409); expect(await evidence.json()).toMatchObject({ exitGate: "BLOCKED" });
  await page.getByRole("link", { name: "Control room", exact: true }).click();
  await page.getByText('Recent recognized commands', { exact: true }).click();
  await expect(page.locator(".input-feed li")).toHaveCount(8); await expect(page.getByRole("link", { name: "Create a showdown" })).toBeVisible();
  await page.screenshot({ path: `${qaPath}/dashboard-simulation-desktop.png`, fullPage: true });
  await page.reload(); await expect(page.locator(".input-feed li")).toHaveCount(8);
  await page.getByRole("link", { name: "Twitch connection", exact: true }).click();
  await page.getByRole("button", { name: "Exit simulation" }).click();
  await expect(page.locator(".workspace-topbar .status")).toHaveText("Not connected");
  await expect(page.locator(".input-feed li")).toHaveCount(8);
});
test("command validation is recoverable and session commands never use browser storage", async ({ page }) => {
  await page.goto("/dashboard/connection"); await expect(page.getByRole("button", { name: "Save commands" })).toBeEnabled();
  await page.getByLabel("Team A · Coral").fill("!same"); await page.getByLabel("Team B · Mint").fill("!SAME"); await page.getByRole("button", { name: "Save commands" }).click();
  await expect(page.getByText("Give each team a different command.")).toBeVisible();
  await page.getByLabel("Team B · Mint").fill("hello !mint"); await page.getByRole("button", { name: "Save commands" }).click();
  await expect(page.getByLabel("Team B · Mint")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Team B · Mint").fill("!other"); await page.getByRole("button", { name: "Save commands" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Team commands saved" })).toBeVisible();
  await page.reload(); await expect(page.getByLabel("Team A · Coral")).toHaveValue("!same");
  const values = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })); expect(values).not.toContain("csrfToken"); expect(values).not.toContain("accessToken");
  expect(await page.evaluate(() => document.cookie)).not.toContain("cta_session");
});
test("maximum-length commands stay readable at 320px without clipping or overlap", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/dashboard/connection"); await expect(page.getByRole("button", { name: "Save commands" })).toBeEnabled();
  await page.getByLabel("Team A · Coral").fill("!abcdefghijklmnopqrst"); await page.getByLabel("Team B · Mint").fill("!uvwxyzabcdefghijklmn");
  await page.getByRole("button", { name: "Save commands" }).click(); await expect(page.getByText("Team commands saved for this session.", { exact: true })).toBeVisible();
  for (const route of ["/dashboard", "/dashboard/round"]) {
    await page.goto(route); await expect(page.locator(".team-name code").first()).toHaveText("!abcdefghijklmnopqrst");
    const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, commands: Array.from(document.querySelectorAll(".team-name code")).map(node => { const range = document.createRange(); range.selectNodeContents(node); const text = range.getBoundingClientRect(); const box = node.parentElement!.getBoundingClientRect(); return { textLeft: text.left, textRight: text.right, left: box.left, right: box.right }; }) }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
    for (const command of bounds.commands) { expect(command.textLeft).toBeGreaterThanOrEqual(command.left - 1); expect(command.textRight).toBeLessThanOrEqual(command.right + 1); }
    if (route === "/dashboard") await page.screenshot({ path: `${qaPath}/dashboard-long-commands-320.png`, fullPage: true });
  }
});
test("server failure offers recovery and never preserves a green connection badge", async ({ page }) => {
  await page.route("**/api/session", route => route.abort());
  await page.goto("/dashboard/connection");
  await expect(page.getByText("Control room updates are unavailable.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry updates" })).toBeEnabled();
  await expect(page.locator(".status-success")).toHaveCount(0);
  await page.screenshot({ path: `${qaPath}/server-unavailable-desktop.png`, fullPage: true });
  await page.unroute("**/api/session"); await page.getByRole("button", { name: "Retry updates" }).click();
  await expect(page.getByRole("button", { name: "Run local simulation" })).toBeEnabled();
});

test("a late command response cannot overwrite a newer realtime snapshot", async ({ page }) => {
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  let arrived!: () => void; const responseArrived = new Promise<void>(resolve => { arrived = resolve; });
  await page.route("**/api/commands", async route => { const response = await route.fetch(); arrived(); await held; await route.fulfill({ response }); });
  await page.goto("/dashboard/connection"); await expect(page.getByRole("button", { name: "Save commands" })).toBeEnabled();
  await page.getByRole("button", { name: "Save commands" }).click(); await responseArrived;
  const session = await (await page.request.get("/api/session")).json() as { csrfToken: string };
  const started = await page.request.post("/api/simulation/start", { headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": session.csrfToken }, data: {} }); expect(started.ok()).toBe(true);
  await expect(page.getByText("Sequence complete", { exact: true })).toBeVisible({ timeout: 8000 }); release();
  await expect(page.getByRole("status").filter({ hasText: "Team commands saved" })).toBeVisible();
  await expect(page.locator(".workspace-topbar .status")).toHaveText("Simulation mode"); await expect(page.locator(".input-feed li")).toHaveCount(8);
});

test("losing client updates removes the previous connected confirmation", async ({ page }) => {
  const snapshot = fixture("connected");
  await page.route("**/api/session", route => route.fulfill({ json: { csrfToken: "x".repeat(43), snapshot } }));
  await page.addInitScript(data => {
    class FixtureEventSource extends EventTarget {
      onerror: ((event: Event) => void) | null = null;
      constructor() { super(); Object.assign(window, { dropConnectionFixture: () => this.onerror?.(new Event("error")) }); setTimeout(() => this.dispatchEvent(new MessageEvent("connection.snapshot", { data: JSON.stringify({ type: "connection.snapshot", snapshot: data }) })), 50); }
      close() {}
    }
    window.EventSource = FixtureEventSource as unknown as typeof EventSource;
  }, snapshot);
  await page.goto("/dashboard/connection"); await expect(page.locator(".connected-check")).toBeVisible();
  await page.evaluate(() => (window as unknown as { dropConnectionFixture(): void }).dropConnectionFixture());
  await expect(page.getByText("Connection updates interrupted.")).toBeVisible();
  await expect(page.locator(".connected-check")).toHaveCount(0); await expect(page.locator(".connection-state-connected")).toHaveCount(0);
  await expect(page.locator(".workspace-topbar .status")).toHaveText("Updates unavailable");
});

function fixture(state: ConnectionState): ConnectionSnapshot {
  return { protocolVersion: 2, revision: 1, state, mode: state === "simulation" ? "simulation" : ["connected", "connecting", "reconnecting"].includes(state) ? "twitch" : "idle", channel: ["connected", "connecting", "reconnecting"].includes(state) ? { id: "123", login: "fixture_broadcaster", displayName: "Fixture broadcaster" } : null, credentialsConfigured: true, authorized: ["connected", "connecting", "reconnecting"].includes(state), persistence: "encrypted", issue: state === "authorization_expired" ? "authorization_revoked" : state === "connection_failed" ? "reconnect_exhausted" : state === "reconnecting" ? "transport_lost" : null, notice: null, commands: { ...DEFAULT_KEYWORDS }, inputs: [], counters: { ...EMPTY_COUNTERS }, lastEventAt: null, lastHeartbeatAt: null, reconnectAttempt: state === "reconnecting" ? 2 : 0, simulation: state === "simulation" ? { running: true, step: "quiet" } : null, evidence: { origin: "test_fixture", liveMessageReceivedAt: null, eventId: null } };
}
for (const state of CONNECTION_STATES) test(`fixture UI: ${state} is explicit and distinct`, async ({ page }) => {
  const snapshot = fixture(state);
  await page.route("**/api/session", route => route.fulfill({ json: { csrfToken: "x".repeat(43), snapshot } }));
  await page.addInitScript(data => {
    class FixtureEventSource extends EventTarget {
      onerror = null; timer: ReturnType<typeof setInterval>;
      constructor() {
        super(); this.timer = setInterval(() => this.dispatchEvent(new MessageEvent("connection.snapshot", { data: JSON.stringify({ type: "connection.snapshot", snapshot: data }) })), 50);
      }
      close() { clearInterval(this.timer); }
    }
    window.EventSource = FixtureEventSource as unknown as typeof EventSource;
  }, snapshot);
  await page.goto("/dashboard/connection");
  await expect(page.getByText("Test provider — this screen uses automated fixtures.", { exact: false })).toBeVisible();
  await expect(page.locator(`.connection-state-${state}`)).toBeVisible();
  await expect(page.locator(".connection-panel-header .status")).toContainText("Test provider");
  await page.screenshot({ path: `${qaPath}/fixture-${state}-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (["connected", "authorization_expired", "reconnecting"].includes(state)) await page.screenshot({ path: `${qaPath}/fixture-${state}-390.png`, fullPage: true });
});
