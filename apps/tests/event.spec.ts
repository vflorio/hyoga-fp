import { expect, test } from "@playwright/test";

test("video completes", async ({ page }) => {
  await page.goto("http://localhost:5174");

  await page.evaluate(() => {
    window.__videoEndedPromise = new Promise((resolve) => {
      window.addEventListener("video-ended", () => resolve(true), { once: true });
    });
  });

  await expect(page.evaluate(() => window.__videoEndedPromise)).resolves.toBeTruthy({
    timeout: 45000,
  });
});
