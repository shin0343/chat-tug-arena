import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const qaPath = "docs/qa/phase7/regression";
test.beforeAll(async () => {
  await mkdir(qaPath, { recursive: true });
});
test("landing makes the game playable without claiming a live connection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ONE CHAT.",
  );
  await expect(
    page.getByText("Demo only. No Twitch chat is connected."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pull for Coral" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Coral pulls left. This is a local demo.",
  );
  await expect.poll(async () => Number(await page.locator('.game-art').getAttribute('data-position'))).toBe(-0.16);
  await page.getByRole("button", { name: "Reset demo rope" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Rope reset to the center.",
  );
  await page.screenshot({
    path: `${qaPath}/landing-desktop.png`,
    fullPage: true,
  });
});
test("dashboard is disconnected with an empty history and a clear creation action", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(
    page.locator(".workspace-topbar .status"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a showdown" }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start showdown' })).toHaveCount(0);
  await page.getByText('Recent recognized commands', { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No team inputs yet" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${qaPath}/dashboard-desktop.png`,
    fullPage: true,
  });
});
test("setup offers a transparent preview continuation", async ({ page }) => {
  await page.goto("/setup");
  await expect(
    page.getByRole("button", { name: "Authorize with Twitch", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue to round setup" }).click();
  await expect(page).toHaveURL(/dashboard\/round$/);
  await expect(page.getByLabel("Showdown question")).toBeVisible();
});
test("round validation keeps edits and focuses the invalid field", async ({
  page,
}) => {
  await page.goto("/dashboard/round");
  await page.getByLabel("Showdown question").fill("  ");
  await page.getByRole("button", { name: "Save showdown" }).click();
  await expect(
    page.getByText("Enter a showdown question.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Showdown question")).toBeFocused();
  await page.getByLabel("Showdown question").fill("Tea vs Coffee");
  await page.getByLabel("Coral choice", { exact: true }).fill("Tea crew");
  await page.getByLabel("Mint choice", { exact: true }).fill("tea CREW");
  await page.getByRole("button", { name: "Save showdown" }).click();
  await expect(
    page.getByText("Give each choice a different name."),
  ).toBeVisible();
  await expect(page.getByLabel("Mint choice", { exact: true })).toBeFocused();
});
test("saved settings survive reload and appear in the control room", async ({
  page,
}) => {
  await page.goto("/dashboard/round");
  await page.getByLabel("Showdown question").fill("Tea vs Coffee");
  await page.getByLabel("Coral choice", { exact: true }).fill("Tea crew");
  await page.getByLabel("Mint choice", { exact: true }).fill("Coffee crew");
  await page.getByRole("radio", { name: /60\s*sec/ }).check();
  await page.getByText('Advanced fairness settings', { exact: true }).click();
  await page.getByLabel("Viewer cooldown").selectOption("3");
  await page.getByRole("button", { name: "Save showdown" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Showdown saved for this session.",
  );
  await page.reload();
  await expect(page.getByLabel("Showdown question")).toHaveValue("Tea vs Coffee");
  await page.getByRole("link", { name: "Control room", exact: true }).click();
  await expect(page.getByText("Tea vs Coffee", { exact: true })).toBeVisible();
  await expect(page.locator('.showdown-rules')).toContainText('60s');
  await expect(page.locator('.showdown-rules')).toContainText('3s');
  await page.goto('/dashboard/mechanics'); await expect(page.getByText('Uses saved round settings: 60s, 3s cooldown.', { exact: false })).toBeVisible();
});
test("legacy browser preview data cannot corrupt the server showdown draft", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.evaluate(() =>
    localStorage.setItem("chat-tug:round-config:v1", "{broken-json"),
  );
  await page.goto("/dashboard/round");
  await expect(page.getByLabel("Coral choice", { exact: true })).toHaveValue("Mage");
  await expect(page.getByLabel("Showdown question")).toHaveValue("Which character should I use next?");
});
test("server-session showdown saving works when browser storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
  });
  await page.goto("/dashboard/round");
  await page.getByLabel("Showdown question").fill("Keep my edits");
  await page.getByRole("button", { name: "Save showdown" }).click();
  await expect(page.getByRole('status')).toContainText('Showdown saved for this session.');
  await page.reload();
  await expect(page.getByLabel("Showdown question")).toHaveValue("Keep my edits");
});
test("connection and configuration desktop evidence", async ({ page }) => {
  await page.goto("/dashboard/connection");
  await expect(page.getByRole("button", { name: "Run local simulation" })).toBeEnabled();
  await page.screenshot({
    path: `${qaPath}/connection-desktop.png`,
    fullPage: true,
  });
  await page.goto("/dashboard/round");
  await page.screenshot({
    path: `${qaPath}/round-desktop.png`,
    fullPage: true,
  });
  await page.goto("/dashboard/overlay");
  await expect(
    page
      .frameLocator(".source-iframe")
      .getByText("Waiting for a round", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${qaPath}/overlay-setup-desktop.png`,
    fullPage: true,
  });
});
test("overlay keeps a transparent upper canvas and honest standby state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/overlay");
  await expect(
    page.getByText("Waiting for Twitch", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("--:--", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator("nav")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(0);
  await page.screenshot({
    path: `${qaPath}/overlay-transparent.png`,
    omitBackground: true,
  });
  await page.goto("/overlay?preview=1");
  await page.screenshot({ path: `${qaPath}/overlay-preview.png` });
});
test("overlay copy has a genuine success and a clipboard failure path", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/dashboard/overlay");
  await page.getByText('Need a disconnected layout preview?', { exact: true }).click();
  await page.getByRole("button", { name: "Copy preview URL" }).click();
  await expect(page.getByRole("status")).toContainText("Preview URL copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${new URL(page.url()).origin}/overlay`,
  );
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("blocked"));
  });
  await page.getByRole("button", { name: "Copy preview URL" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Clipboard access was blocked",
  );
});
test("small layouts stay within the viewport with readable page navigation", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
    for (const [route, name] of [
      ["/", "landing"],
      ["/dashboard", "dashboard"],
      ["/dashboard/round", "round"],
      ["/dashboard/connection", "connection"],
      ["/dashboard/overlay", "overlay-setup"],
      ["/setup", "setup"],
    ]) {
      await page.goto(route!);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (["/setup", "/dashboard/connection"].includes(route!)) await expect(page.getByRole("button", { name: "Run local simulation" })).toBeEnabled();
      else if (route!.startsWith("/dashboard")) await expect(page.locator(".workspace-topbar .status")).not.toContainText("Checking connection");
      const sizes = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(sizes.scroll, `${route} at ${width}px`).toBeLessThanOrEqual(
        sizes.viewport,
      );
      if (name === "overlay-setup") {
        const frame = page.frameLocator(".source-iframe");
        await expect(
          frame.getByRole("heading", { name: "Mint crew" }),
        ).toBeVisible();
        const source = await page
          .locator(".overlay-preview-checker")
          .boundingBox();
        const mint = await frame
          .getByRole("heading", { name: "Mint crew" })
          .boundingBox();
        expect(mint!.x + mint!.width).toBeLessThanOrEqual(
          source!.x + source!.width,
        );
        expect(source!.x + source!.width).toBeLessThanOrEqual(width);
      }
      if (width === 390 || (width === 1024 && name === "dashboard"))
        await page.screenshot({
          path: `${qaPath}/${name}-${width}.png`,
          fullPage: true,
        });
    }
  }
});
test("keyboard focus and reduced motion remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await expect(page.locator(".pulling-group")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});

test("all product routes render without browser errors", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const route of [
    "/",
    "/setup",
    "/dashboard",
    "/dashboard/round",
    "/dashboard/connection",
    "/dashboard/overlay",
    "/dashboard/history",
    "/overlay?preview=1",
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("main")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  }
  expect(errors).toEqual([]);
  const health = await request.get(`http://127.0.0.1:${process.env.REALTIME_PORT ?? 3001}/health`);
  expect(await health.json()).toMatchObject({
    phase: "game-engine",
    acceptingRounds: true,
  });
  expect((await request.get("/licenses/dm-sans-OFL.txt")).status()).toBe(200);
  expect(
    (await request.get("/licenses/barlow-condensed-OFL.txt")).status(),
  ).toBe(200);
  const missing = await page.goto("/no-such-arena");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("link", { name: "Open control room" }),
  ).toBeVisible();
});
