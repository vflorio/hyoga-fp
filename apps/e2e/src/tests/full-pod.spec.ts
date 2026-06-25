// Full Ad Pod Lifecycle Test
// Watches the entire ad session lifecycle: Init → Preroll → Content → Midroll → Content (overlays) → Postroll → Done
// Run with: npx playwright test full-pod.spec.ts --headed --timeout=120000

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AdSession, TimelineEntry } from "@hyoga-fp/validation";
import { buildReport, comparePods, correlateRequests, renderHtmlReport, validateSession } from "@hyoga-fp/validation";
import { captureDiagnostics } from "../diagnostics/capture";
import { expect, test } from "../fixtures/adTest";

const REPORT_DIR = "test-results/reports";

// Phase transitions we expect to see (in order) when the full ad pod is served
const EXPECTED_PHASE_FLOW = ["Init", "Preroll", "Content", "Midroll", "Content", "Postroll", "Done"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────

/** Pretty-print a timeline entry for console output */
const formatEntry = (entry: TimelineEntry, sessionStart: number): string => {
  const relativeMs = entry.timestamp - sessionStart;
  const secs = (relativeMs / 1000).toFixed(2);
  const parts = [`+${secs}s`, entry.eventName];
  if (entry.phase) parts.push(`phase=${entry.phase}`);
  if (entry.adId) parts.push(`adId=${entry.adId}`);
  if (entry.slotId) parts.push(`slotId=${entry.slotId}`);
  return parts.join("  ");
};

/** Summarize ad slot breakdown from the session */
const slotBreakdown = (session: AdSession) => {
  const slots = Object.values(session.slots);
  return {
    preroll: slots.filter((s) => s.timePositionClass === "PREROLL").length,
    midroll: slots.filter((s) => s.timePositionClass === "MIDROLL").length,
    overlay: slots.filter((s) => s.timePositionClass === "OVERLAY").length,
    postroll: slots.filter((s) => s.timePositionClass === "POSTROLL").length,
    pauseMidroll: slots.filter((s) => s.timePositionClass === "PAUSE_MIDROLL").length,
  };
};

// ── Test ─────────────────────────────────────────────────────────────────

test.describe("Full Ad Pod Lifecycle", () => {
  // Longer timeout — full ad pod may take 60-90s to play through
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    await mkdir(REPORT_DIR, { recursive: true });
  });

  test("complete ad pod consumption: Preroll → Content → Midroll → Overlays → Postroll", async ({
    page,
    adRuntime,
    networkCapture,
  }) => {
    // ── 1. Navigate & wait for SDK ──
    await page.goto("/");
    await page.waitForFunction(() => (window as any).tv?.freewheel?.SDK != null, { timeout: 15_000 });

    // ── 2. Click "Play" to request ads ──
    const playButton = page.locator("button", { hasText: "Play" });
    await expect(playButton).toBeVisible({ timeout: 5_000 });
    await playButton.click();

    // ── 3. Wait for runtime to initialize ──
    await page.waitForFunction(() => (window as any).__AD_RUNTIME__ != null, { timeout: 10_000 });

    // ── 4. Wait for first state change (Init phase) ──
    await page.waitForFunction(
      () => {
        const rt = (window as any).__AD_RUNTIME__ as AdSession | undefined;
        return rt?.timeline?.some((e: any) => e.eventName === "StateChange");
      },
      { timeout: 15_000 },
    );

    const initSession = await adRuntime.getSession();
    const breakdown = slotBreakdown(initSession);

    // Attach slot breakdown to test report
    test.info().annotations.push({
      type: "slot-breakdown",
      description: JSON.stringify(breakdown),
    });

    const hasTemporalAds = breakdown.preroll + breakdown.midroll + breakdown.postroll > 0;

    if (!hasTemporalAds) {
      // Ad server returned no temporal ads — capture diagnostics and skip
      console.log("⚠ Ad server returned 0 temporal slots — skipping full pod validation");
      console.log("  Slot breakdown:", JSON.stringify(breakdown));
      test.skip(true, "FreeWheel ad server returned no temporal ad slots in this environment");
      return;
    }

    console.log("✓ Temporal ads received:", JSON.stringify(breakdown));

    // ── 5. Wait for session to complete (all ads + content played through) ──
    await page.waitForFunction(
      () => {
        const rt = (window as any).__AD_RUNTIME__ as AdSession | undefined;
        if (!rt) return false;
        return rt.endTimestamp != null || rt.timeline.some((e: any) => e.eventName === "Complete");
      },
      { timeout: 100_000 },
    );

    const session = await adRuntime.getSession();

    // ── 6. Print full timeline to console ──
    console.log("\n═══════════════════════════════════════════════");
    console.log("  FULL AD POD TIMELINE");
    console.log("═══════════════════════════════════════════════\n");
    for (const entry of session.timeline) {
      console.log(`  ${formatEntry(entry, session.startTimestamp)}`);
    }
    console.log("\n═══════════════════════════════════════════════\n");

    // ── 7. Validate phase flow ──
    const phaseChanges = session.timeline.filter((e) => e.eventName === "StateChange");
    const phases = phaseChanges.map((e) => e.phase);
    console.log("Phase flow:", phases.join(" → "));

    // Verify Init and Done are present
    expect(phases, "Should start with Init").toContain("Init");
    expect(phases, "Should end with Done").toContain("Done");

    // ── 8. Validate preroll lifecycle (if present) ──
    if (breakdown.preroll > 0) {
      const prerollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "PREROLL");
      console.log(`\n✓ Preroll: ${prerollSlots.length} slot(s)`);

      for (const slot of prerollSlots) {
        expect(slot.started, `Preroll slot ${slot.customId} should have started`).toBe(true);
        expect(slot.ended, `Preroll slot ${slot.customId} should have ended`).toBe(true);

        // Preroll must happen before Content phase
        const contentPhase = phaseChanges.find((e) => e.phase === "Content");
        if (contentPhase && slot.startTimestamp) {
          expect(slot.startTimestamp, "Preroll should start before content").toBeLessThanOrEqual(
            contentPhase.timestamp,
          );
        }
      }

      // Verify preroll impressions
      const prerollImpressions = session.timeline.filter(
        (e) =>
          e.eventName === "AdImpression" &&
          e.timestamp < (phaseChanges.find((p) => p.phase === "Content")?.timestamp ?? Infinity),
      );
      console.log(`  Impressions during preroll: ${prerollImpressions.length}`);
      expect(prerollImpressions.length, "Preroll should have at least one impression").toBeGreaterThan(0);
    }

    // ── 9. Validate midroll lifecycle (if present) ──
    if (breakdown.midroll > 0) {
      const midrollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "MIDROLL");
      console.log(`\n✓ Midroll: ${midrollSlots.length} slot(s)`);

      for (const slot of midrollSlots) {
        expect(slot.started, `Midroll slot ${slot.customId} should have started`).toBe(true);
        expect(slot.ended, `Midroll slot ${slot.customId} should have ended`).toBe(true);
      }

      // Content should pause during midroll
      const contentPaused = session.timeline.find((e) => e.eventName === "ContentVideoPaused");
      const contentResumed = session.timeline.find((e) => e.eventName === "ContentVideoResumed");
      expect(contentPaused, "Content should pause for midroll").toBeTruthy();
      expect(contentResumed, "Content should resume after midroll").toBeTruthy();

      if (contentPaused && contentResumed) {
        expect(contentResumed.timestamp, "Content resume should happen after pause").toBeGreaterThan(
          contentPaused.timestamp,
        );
        console.log(`  Content paused at +${((contentPaused.timestamp - session.startTimestamp) / 1000).toFixed(2)}s`);
        console.log(
          `  Content resumed at +${((contentResumed.timestamp - session.startTimestamp) / 1000).toFixed(2)}s`,
        );
      }
    }

    // ── 10. Validate overlay lifecycle (if present) ──
    if (breakdown.overlay > 0) {
      const overlaySlots = Object.values(session.slots).filter((s) => s.timePositionClass === "OVERLAY");
      console.log(`\n✓ Overlays: ${overlaySlots.length} slot(s)`);

      for (const slot of overlaySlots) {
        expect(slot.started, `Overlay slot ${slot.customId} should have started`).toBe(true);
      }

      // Overlays should NOT cause a phase change away from Content
      const overlayPhases = phaseChanges.filter((e) => e.phase === "Content");
      expect(overlayPhases.length, "Content phase should persist during overlays").toBeGreaterThan(0);
    }

    // ── 11. Validate postroll lifecycle (if present) ──
    if (breakdown.postroll > 0) {
      const postrollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "POSTROLL");
      console.log(`\n✓ Postroll: ${postrollSlots.length} slot(s)`);

      for (const slot of postrollSlots) {
        expect(slot.started, `Postroll slot ${slot.customId} should have started`).toBe(true);
        expect(slot.ended, `Postroll slot ${slot.customId} should have ended`).toBe(true);
      }

      // Postroll should happen after all content
      const donePhase = phaseChanges.find((e) => e.phase === "Done");
      const postrollPhase = phaseChanges.find((e) => e.phase === "Postroll");
      if (postrollPhase && donePhase) {
        expect(postrollPhase.timestamp, "Postroll phase should precede Done").toBeLessThan(donePhase.timestamp);
      }
    }

    // ── 12. Validate all impression pairs (AdImpression ↔ AdImpressionEnd) ──
    const impressions = session.timeline.filter((e) => e.eventName === "AdImpression");
    const impressionEnds = session.timeline.filter((e) => e.eventName === "AdImpressionEnd");

    console.log(`\n✓ Total impressions: ${impressions.length}`);
    console.log(`  Total impression ends: ${impressionEnds.length}`);

    for (const imp of impressions) {
      const matchingEnd = impressionEnds.find((e) => e.adId === imp.adId);
      expect(matchingEnd, `AdImpression for adId=${imp.adId} should have a matching AdImpressionEnd`).toBeTruthy();
      if (matchingEnd) {
        expect(
          matchingEnd.timestamp,
          `AdImpressionEnd for adId=${imp.adId} should come after impression`,
        ).toBeGreaterThanOrEqual(imp.timestamp);
      }
    }

    // ── 13. No errors ──
    const errors = session.timeline.filter((e) => e.eventName === "AdError");
    expect(errors, "Session should have no AdError events").toHaveLength(0);

    // ── 14. Validate creatives completed ──
    const creatives = Object.values(session.creatives);
    console.log(`\n✓ Creatives: ${creatives.length}`);
    for (const creative of creatives) {
      console.log(`  ${creative.adId}: ${creative.state}`);
    }

    // ── 15. Run validation engine ──
    const validation = validateSession(session);
    const podComparison = comparePods(session);

    console.log(`\n✓ Validation: ${validation.passed ? "PASSED" : "FAILED"}`);
    console.log(`  Rules checked: ${validation.summary.total}`);
    console.log(`  Errors: ${validation.summary.errors}, Warnings: ${validation.summary.warnings}`);

    if (!validation.passed) {
      for (const v of validation.violations) {
        console.log(`  ✗ [${v.severity}] ${v.rule}: ${v.message}`);
      }
    }

    // ── 16. Network correlation ──
    const adIds = Object.keys(session.creatives);
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

    console.log(`\n✓ Network: ${networkCapture.getAdRequests().length} ad-related requests captured`);
    console.log(`  Tracking requests: ${networkCapture.getTrackingRequests().length}`);

    // ── 17. Generate reports ──
    const report = buildReport(session, validation, podComparison, correlation);
    const reportJson = join(REPORT_DIR, "full-pod-report.json");
    const reportHtml = join(REPORT_DIR, "full-pod-report.html");
    await writeFile(reportJson, JSON.stringify(report, null, 2), "utf-8");
    await writeFile(reportHtml, renderHtmlReport(report), "utf-8");

    console.log(`\n✓ Reports saved:`);
    console.log(`  JSON: ${reportJson}`);
    console.log(`  HTML: ${reportHtml}`);

    // ── 18. Capture diagnostics on failure ──
    if (!validation.passed) {
      await captureDiagnostics(page, "full-pod-lifecycle");
    }

    // ── 19. Final assertions ──
    expect(podComparison.playedAds, "All expected ads should play").toBe(podComparison.expectedAds);
    expect(podComparison.missingAds, "No ads should be missing").toHaveLength(0);
    expect(validation.passed, `Validation failed: ${validation.violations.map((v) => v.message).join("; ")}`).toBe(
      true,
    );

    console.log("\n═══════════════════════════════════════════════");
    console.log("  ✓ FULL AD POD LIFECYCLE VALIDATED");
    console.log("═══════════════════════════════════════════════\n");
  });
});
