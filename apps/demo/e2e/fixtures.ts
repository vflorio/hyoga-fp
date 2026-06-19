import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Path helpers ───────────────────────────────────────────────────────────
const repoRoot = path.resolve(__dirname, "../../..");

const vendorSdkPath = path.join(repoRoot, ".vendor", "AdManager.js");
const adFixturePath = path.join(__dirname, "fixtures/ad-response.xml");

// ── Shared setup applied to every test ────────────────────────────────────

export const test = base.extend<{ setup: void }>({
  setup: [
    async ({ page }, use) => {
      // 1. Inject mock SDK and video helpers before page scripts run
      await page.addInitScript({
        path: path.join(__dirname, "helpers/fw-sdk-mock.js"),
      });
      await page.addInitScript({
        path: path.join(__dirname, "helpers/video-mock.js"),
      });

      // 2. Route the SDK script to a no-op so it doesn't overwrite our mock SDK
      // (addInitScript runs first and sets window.tv.freewheel.SDK = mockSDK;
      //  we must prevent the real AdManager.js from clobbering it)
      await page.route("https://mssl.fwmrm.net/**", (route) =>
        route.fulfill({
          body: "/* sdk stub */",
          contentType: "application/javascript",
        }),
      );

      // 3. Route the ad server to the fixture XML (when it exists)
      await page.route("http://demo.v.fwmrm.net/**", async (route) => {
        const fs = await import("node:fs/promises");
        try {
          const body = await fs.readFile(adFixturePath, "utf-8");
          await route.fulfill({ body, contentType: "application/xml" });
        } catch {
          // Fixture not yet captured – let it pass through so capture.spec works
          await route.continue();
        }
      });

      // 4. Abort video source requests (we don't need actual video in tests)
      await page.route("https://test-videos.co.uk/**", (route) =>
        route.abort(),
      );

      await use();
    },
    { auto: true },
  ],
});

export { expect };

// ── Reusable page interactions ─────────────────────────────────────────────

export const clickPlay = (page: Page) =>
  page.getByRole("button", { name: "Play" }).click();

export const clickPause = (page: Page) =>
  page.getByRole("button", { name: "Pause" }).click();

export const clickResume = (page: Page) =>
  page.getByRole("button", { name: "Resume" }).click();

// ── Mock accessors (run in the browser, return serialised values) ──────────

type SlotKey = "preroll" | "midroll" | "overlay" | "postroll" | "pauseMidroll";
type CallCounts = { play: number; pause: number; resume: number };

export const getCalls = (page: Page) =>
  page.evaluate(() => {
    const m = (window as any).__fwMock;
    // Serialise the nested object explicitly (structured clone flattens getters)
    const c = m.calls;
    return {
      preroll: { ...c.preroll },
      midroll: { ...c.midroll },
      overlay: { ...c.overlay },
      postroll: { ...c.postroll },
      pauseMidroll: { ...c.pauseMidroll },
    } as Record<SlotKey, CallCounts>;
  });

export const getVideoStates = (page: Page) =>
  page.evaluate(() => [...(window as any).__fwMock.videoStates] as string[]);

export const getDispatchedEvents = (page: Page) =>
  page.evaluate(
    () =>
      (window as any).__fwMock.dispatchedEvents as Array<{
        event: string;
        data: Record<string, unknown>;
      }>,
  );

export const setSlotConfig = (page: Page, cfg: Record<string, number>) =>
  page.evaluate(
    (c) => Object.assign((window as any).__fwMock.slotConfig, c),
    cfg,
  );

export const slotEnded = (page: Page, type: string) =>
  page.evaluate((t) => (window as any).__fwMock.slotEnded(t), type);

export const timeupdate = (page: Page, time: number) =>
  page.evaluate((t) => (window as any).__videoMock.timeupdate(t), time);

export const videoEnded = (page: Page) =>
  page.evaluate(() => (window as any).__videoMock.ended());
