import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __playwrightStates: Record<string, boolean>;
  }
}

const transitionDuration = 5_000;

const videoDuration = 60_000;
const prerollDuration = 30_000;
const midrollDuration = 30_000;
const postrollDuration = 40_000;

const completeDuration = prerollDuration + midrollDuration + postrollDuration + videoDuration;

const states = ["Init", "Preroll", "Content", "Midroll", "PauseMidroll", "Postroll", "Done"] as const;

test("video completes", async ({ page }) => {
  test.setTimeout(completeDuration);

  // Utile per vedere i console.log della pagina durante il debug
  page.on("console", console.log);

  await page.addInitScript((states: readonly string[]) => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });

    (window as any).__playwrightStates = {};

    for (const state of states) {
      window.addEventListener(
        `playwright.state.${state}`,
        () => {
          console.log(`received ${state}`);
          (window as any).__playwrightStates[state] = true;
        },
        { once: true },
      );
    }
  }, states);

  await page.goto("http://localhost:5173");

  await page.getByRole("button", { name: "Play" }).click();

  await page.waitForFunction(() => window.__playwrightStates.Init);

  await page.waitForFunction(() => window.__playwrightStates.Preroll);
  await page.waitForTimeout(transitionDuration);

  await page.waitForFunction(() => window.__playwrightStates.Content);
  await page.waitForTimeout(prerollDuration + transitionDuration);

  await page.waitForFunction(() => window.__playwrightStates.Midroll);
  await page.waitForTimeout(midrollDuration + transitionDuration);

  await page.waitForFunction(() => window.__playwrightStates.Postroll);
  await page.waitForTimeout(postrollDuration + transitionDuration);

  await page.waitForFunction(() => window.__playwrightStates.PauseMidroll);
  await page.waitForTimeout(midrollDuration + transitionDuration);

  await page.waitForFunction(() => window.__playwrightStates.Done);

  await expect(page.evaluate(() => window.__playwrightStates.Done)).resolves.toBe(true);
});
