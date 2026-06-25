import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: false, // Ad sessions must run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // Postroll triggers at 120s of content + preroll/midroll ad playback time
  timeout: 180_000,
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // FreeWheel SDK sends _fw_br_wd=navigator.webdriver to the ad server.
        // When _fw_br_wd=1 (automation detected), the server filters it as IVT
        // (Invalid Traffic) and returns 0 ads. We disable the Chromium automation
        // flag so the SDK reports _fw_br_wd=0, matching real browser behavior.
        launchOptions: {
          args: ["--disable-blink-features=AutomationControlled"],
        },
      },
    },
  ],
  // Start the demo app before running tests
  // In local mode with reuseExistingServer, ensure the demo is already running.
  webServer: process.env.CI
    ? {
        command: "pnpm --filter @hyoga-fp/demo demo:freewheel:dev",
        cwd: "../..",
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 30_000,
        env: {
          VITE_ENABLE_AD_RUNTIME: "false",
        },
      }
    : undefined,
});
