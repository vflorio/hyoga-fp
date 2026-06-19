/**
 * Run ONCE (manually, headed) to capture a real ad response from the FreeWheel
 * demo server.  FreeWheel's SDK detects headless browsers via navigator.webdriver,
 * window.chrome, and the Navigator.permissions API (see IVT / Fraud docs) and
 * will return empty/blocked responses in a headless environment.
 *
 * Run with a real headed Chromium:
 *
 *   cd apps/demo
 *   pnpm test:e2e:capture --headed
 *
 * Saves the XML body to e2e/fixtures/ad-response.xml.
 * After capture the regular test suite uses that fixture offline and the
 * FreeWheel SDK is replaced by the in-process mock — headless detection is
 * irrelevant for the main suite.
 *
 * Prerequisites
 *   .vendor/AdManager.js must exist (see README §Testing).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixturePath = path.join(__dirname, "fixtures/ad-response.xml");
const vendorSdkPath = path.join(__dirname, "../../.vendor/AdManager.js");

test("capture FreeWheel ad response fixture", async ({ page }) => {
  // FreeWheel detects headless browsers and returns blocked/empty responses.
  // This test must be run with --headed to get a real ad response.
  test.skip(
    !process.env.PWHEADED && process.env.HEADED !== "1",
    "Capture test requires a headed browser (run with --headed). " +
      "FreeWheel's IVT detection rejects headless traffic.",
  );
  // Route SDK to vendor so we know it loads
  await page.route("https://mssl.fwmrm.net/**", (route) =>
    route.fulfill({
      path: vendorSdkPath,
      contentType: "application/javascript",
    }),
  );

  // Abort video so we don't wait for large download
  await page.route("https://test-videos.co.uk/**", (route) => route.abort());

  let capturedXml = "";
  page.on("response", async (res) => {
    if (res.url().includes("demo.v.fwmrm.net")) {
      try {
        capturedXml = await res.text();
      } catch {
        // ignore body read errors
      }
    }
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Play" }).click();

  // Wait up to 10 s for the SDK to fire the ad request
  await page
    .waitForFunction(() => (window as any).__adRequestFired === true, {
      timeout: 10_000,
    })
    .catch(() => {
      // Fallback: just wait 5 s
    });

  await page.waitForTimeout(5_000);

  if (capturedXml && capturedXml.trim().length > 0) {
    await fs.mkdir(path.dirname(fixturePath), { recursive: true });
    await fs.writeFile(fixturePath, capturedXml, "utf-8");
    console.log(
      `\n✓ Fixture saved (${capturedXml.length} bytes): ${fixturePath}`,
    );
  }

  expect(
    capturedXml.trim().length,
    "No ad response received from demo.v.fwmrm.net",
  ).toBeGreaterThan(0);
});
