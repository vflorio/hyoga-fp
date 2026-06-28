import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __onPlaywrightStateInit: Promise<void>;
    __onPlaywrightStatePreroll: Promise<void>;
    __onPlaywrightStateContent: Promise<void>;
    __onPlaywrightStateMidroll: Promise<void>;
    __onPlaywrightStatePauseMidroll: Promise<void>;
    __onPlaywrightStatePostroll: Promise<void>;
    __onPlaywrightStateDone: Promise<void>;
  }

  interface CustomEventMap {
    "playwright.state.Init": CustomEvent<void>;
    "playwright.state.Preroll": CustomEvent<void>;
    "playwright.state.Content": CustomEvent<void>;
    "playwright.state.Midroll": CustomEvent<void>;
    "playwright.state.PauseMidroll": CustomEvent<void>;
    "playwright.state.Postroll": CustomEvent<void>;
    "playwright.state.Done": CustomEvent<void>;
  }
}

const transitionDuration = 5000; // milliseconds

const videoDuration = 60 * 1000;
const prerollDuration = 30 * 1000; // seconds
const midrollDuration = 30 * 1000; // seconds
const postRollDuration = 40 * 1000; // seconds

const completeDuration = prerollDuration + midrollDuration + postRollDuration + videoDuration;

test("video completes", async ({ page }) => {
  test.setTimeout(completeDuration);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  await page.goto("http://localhost:5173");

  await page.evaluate(() => {
    window.__onPlaywrightStateInit = new Promise((resolve) =>
      window.addEventListener("playwright.state.Init", () => resolve(), { once: true }),
    );
    window.__onPlaywrightStatePreroll = new Promise((resolve) =>
      window.addEventListener("playwright.state.Preroll", () => resolve(), { once: true }),
    );
    window.__onPlaywrightStateContent = new Promise((resolve) =>
      window.addEventListener("playwright.state.Content", () => resolve(), { once: true }),
    );
    window.__onPlaywrightStateMidroll = new Promise((resolve) =>
      window.addEventListener("playwright.state.Midroll", () => resolve(), { once: true }),
    );
    window.__onPlaywrightStatePauseMidroll = new Promise((resolve) =>
      window.addEventListener("playwright.state.PauseMidroll", () => resolve(), { once: true }),
    );
    window.__onPlaywrightStatePostroll = new Promise((resolve) =>
      window.addEventListener("playwright.state.Postroll", () => resolve(), { once: true }),
    );
    window.__onPlaywrightStateDone = new Promise((resolve) =>
      window.addEventListener("playwright.state.Done", () => resolve(), { once: true }),
    );
  });

  // find button with "Play" text and click it
  await page.getByRole("button", { name: "Play" }).click();

  // Wait for all the state transitions to complete
  await expect(page.evaluate(() => window.__onPlaywrightStateInit)).resolves.toBeTruthy();
  await page.waitForTimeout(transitionDuration);

  await expect(page.evaluate(() => window.__onPlaywrightStatePreroll)).resolves.toBeTruthy();
  await page.waitForTimeout(transitionDuration);

  await expect(page.evaluate(() => window.__onPlaywrightStateContent)).resolves.toBeTruthy();
  await page.waitForTimeout(prerollDuration + transitionDuration);

  await expect(page.evaluate(() => window.__onPlaywrightStateMidroll)).resolves.toBeTruthy();
  await page.waitForTimeout(midrollDuration + transitionDuration);

  await expect(page.evaluate(() => window.__onPlaywrightStatePostroll)).resolves.toBeTruthy();
  await page.waitForTimeout(postRollDuration + transitionDuration);

  await expect(page.evaluate(() => window.__onPlaywrightStatePauseMidroll)).resolves.toBeTruthy();
  await page.waitForTimeout(midrollDuration + transitionDuration);

  await expect(page.evaluate(() => window.__onPlaywrightStateDone)).resolves.toBeTruthy();
});
