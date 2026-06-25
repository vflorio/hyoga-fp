// Self-Configuring Ad Validation Test
// Reads runtime state dynamically, generates validation plan, executes checks

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type AdSession,
  buildReport,
  comparePods,
  correlateRequests,
  renderHtmlReport,
  validateSession,
} from "@hyoga-fp/validation";
import { captureDiagnostics } from "../diagnostics/capture";
import { expect, test } from "../fixtures/adTest";
import { validateVideoAd } from "../visual/validation";

const REPORT_DIR = "test-results/reports";

// Helper: wait for session to reach a terminal state (Done/Complete or endTimestamp set)
const waitForSessionEnd = async (page: any, timeoutMs = 120_000) => {
  await page.waitForFunction(
    () => {
      const rt = (window as any).__AD_RUNTIME__;
      if (!rt) return false;
      // Session ends when Complete event is in timeline or endTimestamp is set
      return rt.endTimestamp != null || rt.timeline.some((e: any) => e.eventName === "Complete");
    },
    { timeout: timeoutMs },
  );
};

// Helper: start an ad session (navigate, wait for SDK, click play)
const startSession = async (page: any) => {
  await page.goto("/");
  await page.waitForFunction(() => (window as any).tv?.freewheel?.SDK != null, { timeout: 15_000 });
  const initButton = page.locator("button").first();
  await initButton.click();
  // Wait for runtime to exist
  await page.waitForFunction(() => (window as any).__AD_RUNTIME__ != null, { timeout: 5_000 });
};

test.describe("Ad Session Validation", () => {
  test.beforeAll(async () => {
    await mkdir(REPORT_DIR, { recursive: true });
  });

  test("complete ad session runs and generates report", async ({ page, adRuntime, networkCapture }) => {
    await startSession(page);

    // Wait for session to complete
    await waitForSessionEnd(page);

    const finalSession = await adRuntime.getSession();
    expect(finalSession).toBeTruthy();
    expect(finalSession.sessionId).toBeTruthy();

    // Run validation
    const validation = validateSession(finalSession);
    const podComparison = comparePods(finalSession);

    // Network correlation
    const adIds = Object.keys(finalSession.creatives);
    const networkRequests = networkCapture.getAdRequests().map((r) => ({
      url: r.url,
      type: "custom" as const,
      timestamp: r.timestamp,
      adId: null,
      creativeId: null,
      slotId: null,
      statusCode: r.statusCode,
      correlated: false,
    }));
    const correlation = correlateRequests(networkRequests, adIds);

    // Build and save report
    const report = buildReport(finalSession, validation, podComparison, correlation);
    await writeFile(join(REPORT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf-8");
    await writeFile(join(REPORT_DIR, "report.html"), renderHtmlReport(report), "utf-8");

    // If ads were expected, validate them
    if (podComparison.expectedAds > 0) {
      expect(podComparison.playedAds, "All expected ads should play").toBe(podComparison.expectedAds);
      expect(podComparison.missingAds, "No ads should be missing").toHaveLength(0);
    }

    // Session should complete without validation errors
    expect(validation.passed, `Validation failed: ${validation.violations.map((v) => v.message).join("; ")}`).toBe(
      true,
    );
  });

  test("session completes without errors", async ({ page, adRuntime }) => {
    await startSession(page);
    await waitForSessionEnd(page);

    const session = await adRuntime.getSession();

    // No AdError events in timeline
    const errors = session.timeline.filter((e) => e.eventName === "AdError");
    expect(errors, "No ad errors should occur").toHaveLength(0);

    // Session reached completion
    const complete = session.timeline.find((e) => e.eventName === "Complete");
    expect(complete, "Session should emit Complete event").toBeTruthy();

    // All slots that started should have ended
    for (const slot of Object.values(session.slots)) {
      if (slot.started) {
        expect(slot.ended, `Slot ${slot.customId} started but never ended`).toBe(true);
      }
    }
  });

  test("preroll executes before content (if present)", async ({ page, adRuntime }) => {
    await startSession(page);
    await waitForSessionEnd(page);

    const session = await adRuntime.getSession();

    const firstImpression = session.timeline.find((e) => e.eventName === "AdImpression");
    const firstContentResume = session.timeline.find(
      (e) => e.eventName === "ContentVideoResumed" || e.eventName === "ContentResumed",
    );

    // Only validate ordering if there ARE preroll ads
    if (firstImpression && firstContentResume) {
      const prerollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "PREROLL");
      if (prerollSlots.length > 0) {
        expect(firstImpression.timestamp, "Preroll impression should occur before content resume").toBeLessThanOrEqual(
          firstContentResume.timestamp,
        );
      }
    }
  });

  test("ad breaks follow expected lifecycle (if ads received)", async ({ page, adRuntime }) => {
    await startSession(page);
    await waitForSessionEnd(page);

    const session = await adRuntime.getSession();
    const hasAds = Object.keys(session.creatives).length > 0;

    if (!hasAds) {
      // No ads received from server — skip detailed validation
      return;
    }

    // Every creative that started should reach COMPLETE or SKIPPED
    for (const creative of Object.values(session.creatives)) {
      if (creative.state !== "NOT_REQUESTED" && creative.state !== "SCHEDULED") {
        expect(
          ["COMPLETE", "SKIPPED"].includes(creative.state),
          `Creative ${creative.adId} ended in unexpected state: ${creative.state}`,
        ).toBe(true);
      }
    }

    // Each impression should have a corresponding impression end
    const impressions = session.timeline.filter((e) => e.eventName === "AdImpression");
    const impressionEnds = session.timeline.filter((e) => e.eventName === "AdImpressionEnd");
    expect(impressionEnds.length, "Each impression should have an ImpressionEnd").toBeGreaterThanOrEqual(
      impressions.length,
    );
  });

  test("video ad is visible during playback (if ads received)", async ({ page, adRuntime }) => {
    await startSession(page);
    await waitForSessionEnd(page);

    const session = await adRuntime.getSession();
    const hasAds = session.timeline.some((e) => e.eventName === "AdImpression");

    if (!hasAds) {
      // No ads played — nothing to validate visually
      return;
    }

    const result = await validateVideoAd(page);

    if (!result.passed) {
      await captureDiagnostics(page, "video-ad-visibility");
    }

    const containerPresent = result.checks.find((c) => c.name === "video-element-present");
    expect(containerPresent?.passed, containerPresent?.details).toBe(true);
  });

  test("runtime collector captures state changes", async ({ page, adRuntime }) => {
    await startSession(page);
    await waitForSessionEnd(page);

    const session = await adRuntime.getSession();

    // Should have at least some state changes recorded
    const stateChanges = session.timeline.filter((e) => e.eventName === "StateChange");
    expect(stateChanges.length, "Should record state transitions").toBeGreaterThan(0);

    // Should have transitioned through Init → Content → Done at minimum
    const phases = stateChanges.map((e) => e.phase);
    expect(phases).toContain("Content");
    expect(phases).toContain("Done");
  });
});
