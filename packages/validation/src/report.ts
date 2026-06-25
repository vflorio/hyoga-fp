// Report Generation
// Produces JSON and HTML validation reports

import type { AdSession, TimePositionClass } from "./model.js";
import type { CorrelationResult } from "./network.js";
import type { PodComparisonResult, ValidationResult } from "./rules.js";

// --- JSON Report ---

export interface ValidationReport {
  readonly sessionId: string;
  readonly timestamp: string;
  readonly passed: boolean;
  readonly duration: number; // ms
  readonly expected: {
    readonly totalAds: number;
    readonly breakdown: Record<TimePositionClass, number>;
  };
  readonly actual: {
    readonly totalAds: number;
    readonly breakdown: Record<TimePositionClass, number>;
  };
  readonly validation: ValidationResult;
  readonly podComparison: PodComparisonResult;
  readonly networkCorrelation: {
    readonly totalRequests: number;
    readonly correlated: number;
    readonly uncorrelated: number;
    readonly missingTracking: number;
  };
  readonly errors: string[];
  readonly warnings: string[];
  readonly timeline: Array<{
    readonly timestamp: number;
    readonly event: string;
    readonly details: string;
  }>;
  readonly coverageMatrix: CoverageMatrix;
}

export interface CoverageEntry {
  readonly scenario: string;
  readonly covered: boolean;
  readonly details: string;
}

export type CoverageMatrix = CoverageEntry[];

// --- Build report ---

export const buildReport = (
  session: AdSession,
  validation: ValidationResult,
  podComparison: PodComparisonResult,
  correlation: CorrelationResult,
): ValidationReport => {
  const now = Date.now();
  const duration = (session.endTimestamp ?? now) - session.startTimestamp;

  const expectedBreakdown = buildBreakdown(session, "expected");
  const actualBreakdown = buildBreakdown(session, "actual");

  return {
    sessionId: session.sessionId,
    timestamp: new Date().toISOString(),
    passed: validation.passed,
    duration,
    expected: {
      totalAds: podComparison.expectedAds,
      breakdown: expectedBreakdown,
    },
    actual: {
      totalAds: podComparison.playedAds,
      breakdown: actualBreakdown,
    },
    validation,
    podComparison,
    networkCorrelation: {
      totalRequests: session.networkRequests.length,
      correlated: correlation.correlated.length,
      uncorrelated: correlation.uncorrelated.length,
      missingTracking: correlation.missingTracking.length,
    },
    errors: validation.violations.filter((v) => v.severity === "error").map((v) => v.message),
    warnings: validation.violations.filter((v) => v.severity === "warning").map((v) => v.message),
    timeline: session.timeline.map((e) => ({
      timestamp: e.timestamp,
      event: e.eventName,
      details: [e.adId && `adId=${e.adId}`, e.slotId && `slot=${e.slotId}`, e.phase && `phase=${e.phase}`]
        .filter(Boolean)
        .join(", "),
    })),
    coverageMatrix: buildCoverageMatrix(session, validation),
  };
};

const buildBreakdown = (session: AdSession, mode: "expected" | "actual"): Record<TimePositionClass, number> => {
  const breakdown: Record<TimePositionClass, number> = {
    PREROLL: 0,
    MIDROLL: 0,
    POSTROLL: 0,
    OVERLAY: 0,
    PAUSE_MIDROLL: 0,
  };

  for (const adBreak of Object.values(session.adBreaks)) {
    breakdown[adBreak.timePositionClass] += mode === "expected" ? adBreak.expectedAdCount : adBreak.actualAdCount;
  }

  return breakdown;
};

const buildCoverageMatrix = (session: AdSession, _validation: ValidationResult): CoverageMatrix => {
  const slots = Object.values(session.slots);
  const hasType = (type: TimePositionClass) => slots.some((s) => s.timePositionClass === type);
  const typeCompleted = (type: TimePositionClass) =>
    slots.filter((s) => s.timePositionClass === type).every((s) => s.ended);

  const trackingFired = session.trackingEvents.length > 0;
  const hasCreatives = Object.values(session.creatives).length > 0;

  return [
    {
      scenario: "Preroll",
      covered: hasType("PREROLL"),
      details: hasType("PREROLL")
        ? typeCompleted("PREROLL")
          ? "All prerolls completed"
          : "Some prerolls incomplete"
        : "No prerolls in session",
    },
    {
      scenario: "Midroll",
      covered: hasType("MIDROLL"),
      details: hasType("MIDROLL")
        ? typeCompleted("MIDROLL")
          ? "All midrolls completed"
          : "Some midrolls incomplete"
        : "No midrolls in session",
    },
    {
      scenario: "Postroll",
      covered: hasType("POSTROLL"),
      details: hasType("POSTROLL")
        ? typeCompleted("POSTROLL")
          ? "All postrolls completed"
          : "Some postrolls incomplete"
        : "No postrolls in session",
    },
    {
      scenario: "Overlay",
      covered: hasType("OVERLAY"),
      details: hasType("OVERLAY")
        ? typeCompleted("OVERLAY")
          ? "All overlays completed"
          : "Some overlays incomplete"
        : "No overlays in session",
    },
    {
      scenario: "Companion",
      covered: Object.keys(session.companions).length > 0,
      details: Object.keys(session.companions).length > 0 ? "Companions rendered" : "No companions in session",
    },
    {
      scenario: "Pause Ad",
      covered: hasType("PAUSE_MIDROLL"),
      details: hasType("PAUSE_MIDROLL")
        ? typeCompleted("PAUSE_MIDROLL")
          ? "Pause ads completed"
          : "Pause ads incomplete"
        : "No pause ads in session",
    },
    {
      scenario: "Tracking",
      covered: trackingFired,
      details: trackingFired ? `${session.trackingEvents.length} tracking events fired` : "No tracking events detected",
    },
    {
      scenario: "Visibility",
      covered: hasCreatives,
      details: hasCreatives
        ? `${Object.values(session.creatives).filter((c) => c.state === "COMPLETE").length}/${Object.keys(session.creatives).length} creatives visible+complete`
        : "No creatives to validate",
    },
  ];
};

// --- HTML Report ---

export const renderHtmlReport = (report: ValidationReport): string => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ad Validation Report - ${report.sessionId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
  .container { max-width: 1200px; margin: 0 auto; }
  .header { background: ${report.passed ? "#2e7d32" : "#c62828"}; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
  .header h1 { font-size: 24px; margin-bottom: 8px; }
  .header .status { font-size: 18px; opacity: 0.9; }
  .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .card h2 { font-size: 18px; margin-bottom: 12px; color: #1a1a1a; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .stat { text-align: center; padding: 16px; background: #f8f9fa; border-radius: 6px; }
  .stat .value { font-size: 28px; font-weight: bold; color: #1a1a1a; }
  .stat .label { font-size: 12px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
  th { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
  .badge-error { background: #ffebee; color: #c62828; }
  .badge-warning { background: #fff3e0; color: #e65100; }
  .badge-success { background: #e8f5e9; color: #2e7d32; }
  .timeline { max-height: 400px; overflow-y: auto; }
  .timeline-entry { padding: 8px 12px; border-left: 3px solid #ddd; margin-left: 8px; margin-bottom: 4px; font-size: 13px; }
  .timeline-entry .time { color: #999; font-size: 11px; }
  .coverage-check { color: #2e7d32; } .coverage-cross { color: #c62828; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Ad Validation Report</h1>
    <div class="status">${report.passed ? "✓ PASSED" : "✗ FAILED"} — Session: ${report.sessionId}</div>
    <div class="status">${report.timestamp} | Duration: ${(report.duration / 1000).toFixed(1)}s</div>
  </div>

  <div class="card">
    <h2>Summary</h2>
    <div class="grid">
      <div class="stat"><div class="value">${report.expected.totalAds}</div><div class="label">Expected Ads</div></div>
      <div class="stat"><div class="value">${report.actual.totalAds}</div><div class="label">Played Ads</div></div>
      <div class="stat"><div class="value">${report.validation.summary.errors}</div><div class="label">Errors</div></div>
      <div class="stat"><div class="value">${report.validation.summary.warnings}</div><div class="label">Warnings</div></div>
      <div class="stat"><div class="value">${report.networkCorrelation.correlated}</div><div class="label">Correlated Requests</div></div>
    </div>
  </div>

  <div class="card">
    <h2>Coverage Matrix</h2>
    <table>
      <thead><tr><th>Scenario</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>
${report.coverageMatrix.map((e) => `        <tr><td>${e.scenario}</td><td>${e.covered ? '<span class="coverage-check">✓</span>' : '<span class="coverage-cross">✗</span>'}</td><td>${e.details}</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Ad Breakdown</h2>
    <table>
      <thead><tr><th>Position</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>
      <tbody>
${(["PREROLL", "MIDROLL", "POSTROLL", "OVERLAY", "PAUSE_MIDROLL"] as const).map((pos) => `        <tr><td>${pos}</td><td>${report.expected.breakdown[pos]}</td><td>${report.actual.breakdown[pos]}</td><td>${report.expected.breakdown[pos] === report.actual.breakdown[pos] ? '<span class="badge badge-success">OK</span>' : '<span class="badge badge-error">MISMATCH</span>'}</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>

${
  report.errors.length > 0
    ? `
  <div class="card">
    <h2>Errors</h2>
${report.errors.map((e) => `    <p><span class="badge badge-error">ERROR</span> ${e}</p>`).join("\n")}
  </div>
`
    : ""
}

${
  report.warnings.length > 0
    ? `
  <div class="card">
    <h2>Warnings</h2>
${report.warnings.map((w) => `    <p><span class="badge badge-warning">WARN</span> ${w}</p>`).join("\n")}
  </div>
`
    : ""
}

  <div class="card">
    <h2>Timeline</h2>
    <div class="timeline">
${report.timeline.map((e) => `      <div class="timeline-entry"><span class="time">${new Date(e.timestamp).toISOString().slice(11, 23)}</span> <strong>${e.event}</strong> ${e.details}</div>`).join("\n")}
    </div>
  </div>
</div>
</body>
</html>`;
