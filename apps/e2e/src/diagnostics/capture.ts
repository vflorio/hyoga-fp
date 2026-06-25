// Failure Diagnostics
// Captures comprehensive state on test failure for debugging

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AdSession } from "@hyoga-fp/validation";
import type { Page } from "@playwright/test";

export interface DiagnosticSnapshot {
  readonly timestamp: string;
  readonly screenshot: string; // file path
  readonly domSnapshot: string; // file path
  readonly networkLog: string; // file path
  readonly runtimeSnapshot: string; // file path
  readonly timeline: string; // file path
}

const RESULTS_DIR = "test-results/diagnostics";

export const captureDiagnostics = async (page: Page, testName: string): Promise<DiagnosticSnapshot> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(RESULTS_DIR, `${testName}-${timestamp}`);
  await mkdir(dir, { recursive: true });

  // Screenshot
  const screenshotPath = join(dir, "screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // DOM snapshot
  const domPath = join(dir, "dom.html");
  const domContent = await page.content();
  await writeFile(domPath, domContent, "utf-8");

  // Runtime snapshot
  const runtimePath = join(dir, "runtime.json");
  const runtime: AdSession | null = await page.evaluate(() => (window as any).__AD_RUNTIME__ ?? null);
  await writeFile(runtimePath, JSON.stringify(runtime, null, 2), "utf-8");

  // Timeline
  const timelinePath = join(dir, "timeline.json");
  const timeline = runtime?.timeline ?? [];
  await writeFile(timelinePath, JSON.stringify(timeline, null, 2), "utf-8");

  // Network log (from performance entries)
  const networkPath = join(dir, "network.json");
  const networkEntries = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return entries
      .filter((e) => e.name.includes("fwmrm") || e.name.includes("2mdn") || e.name.includes("doubleclick"))
      .map((e) => ({
        url: e.name,
        startTime: e.startTime,
        duration: e.duration,
        transferSize: e.transferSize,
      }));
  });
  await writeFile(networkPath, JSON.stringify(networkEntries, null, 2), "utf-8");

  return {
    timestamp,
    screenshot: screenshotPath,
    domSnapshot: domPath,
    networkLog: networkPath,
    runtimeSnapshot: runtimePath,
    timeline: timelinePath,
  };
};
