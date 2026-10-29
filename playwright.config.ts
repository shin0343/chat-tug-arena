import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env")) loadEnvFile(".env");
const appOrigin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: appOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION === "1" ? "npm start" : "npm run dev",
    url: appOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // The supervisor owns detached app groups; SIGTERM lets it forward shutdown.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
