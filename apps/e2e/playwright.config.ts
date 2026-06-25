import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5175";

export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: false, // Ad sessions must run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
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
      use: { ...devices["Desktop Chrome"] },
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
          VITE_ENABLE_AD_RUNTIME: "true",
        },
      }
    : undefined,
});
