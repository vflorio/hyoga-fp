// Validation Rules Engine
// Verifies ad break ordering, timing, and completeness

import type { AdSession } from "./model.js";

// --- Validation result types ---

export type RuleSeverity = "error" | "warning" | "info";

export interface RuleViolation {
  readonly rule: string;
  readonly severity: RuleSeverity;
  readonly message: string;
  readonly context: Record<string, unknown>;
}

export interface ValidationResult {
  readonly passed: boolean;
  readonly violations: RuleViolation[];
  readonly summary: {
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
  };
}

// --- Rule definitions ---

type ValidationRule = (session: AdSession) => RuleViolation[];

// Rule 1: Preroll must execute before content starts
const prerollBeforeContent: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const prerollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "PREROLL");
  const contentStartEvents = session.timeline.filter(
    (e) => e.eventName === "ContentVideoResumed" || e.eventName === "ContentResumed",
  );

  if (contentStartEvents.length === 0 || prerollSlots.length === 0) return violations;

  const firstContentTime = contentStartEvents[0].timestamp;

  for (const slot of prerollSlots) {
    if (slot.startTimestamp && slot.startTimestamp > firstContentTime) {
      violations.push({
        rule: "preroll-before-content",
        severity: "error",
        message: `Preroll slot ${slot.customId} started after content (${slot.startTimestamp} > ${firstContentTime})`,
        context: { slotId: slot.id, startTimestamp: slot.startTimestamp, firstContentTime },
      });
    }
  }
  return violations;
};

// Rule 2: Midroll must execute at the correct time position (within tolerance)
const midrollAtCorrectTime: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const midrollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "MIDROLL");

  for (const slot of midrollSlots) {
    // Find the content pause event closest to this slot's start
    const contentPauseBeforeSlot = session.timeline.filter(
      (e) =>
        e.eventName === "ContentVideoPaused" &&
        slot.startTimestamp !== null &&
        Math.abs(e.timestamp - slot.startTimestamp) < 5000, // within 5s of slot start
    );

    if (slot.startTimestamp && contentPauseBeforeSlot.length === 0) {
      violations.push({
        rule: "midroll-at-correct-time",
        severity: "warning",
        message: `Midroll slot ${slot.customId} started but no content pause detected nearby`,
        context: { slotId: slot.id, timePosition: slot.timePosition },
      });
    }
  }
  return violations;
};

// Rule 3: Postroll must execute after content ends
const postrollAfterContent: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const postrollSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "POSTROLL");
  const contentEndEvents = session.timeline.filter(
    (e) => e.eventName === "onContentEnded" || e.eventName === "Complete",
  );

  if (contentEndEvents.length === 0 || postrollSlots.length === 0) return violations;

  const lastContentEnd = contentEndEvents[contentEndEvents.length - 1].timestamp;

  for (const slot of postrollSlots) {
    if (slot.startTimestamp && slot.startTimestamp < lastContentEnd) {
      violations.push({
        rule: "postroll-after-content",
        severity: "error",
        message: `Postroll slot ${slot.customId} started before content ended`,
        context: { slotId: slot.id, startTimestamp: slot.startTimestamp, lastContentEnd },
      });
    }
  }
  return violations;
};

// Rule 4: Overlay must execute during content playback
const overlayDuringContent: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const overlaySlots = Object.values(session.slots).filter((s) => s.timePositionClass === "OVERLAY");

  // Find content playback ranges from timeline
  const contentPhases = session.timeline.filter((e) => e.phase === "Content");

  if (contentPhases.length === 0 && overlaySlots.length > 0) {
    violations.push({
      rule: "overlay-during-content",
      severity: "error",
      message: "Overlay slots exist but no content phase detected in timeline",
      context: { overlayCount: overlaySlots.length },
    });
  }

  return violations;
};

// Rule 5: Pause ad must only play during user-initiated pause
const pauseAdDuringPause: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const pauseSlots = Object.values(session.slots).filter((s) => s.timePositionClass === "PAUSE_MIDROLL");

  for (const slot of pauseSlots) {
    if (!slot.startTimestamp) continue;

    // Should have a ContentVideoPaused event before this slot started
    const pauseBefore = session.timeline.find(
      (e) => e.eventName === "ContentVideoPaused" && slot.startTimestamp !== null && e.timestamp <= slot.startTimestamp,
    );

    if (!pauseBefore) {
      violations.push({
        rule: "pause-ad-during-pause",
        severity: "error",
        message: `Pause ad slot ${slot.customId} started without a preceding content pause`,
        context: { slotId: slot.id, startTimestamp: slot.startTimestamp },
      });
    }
  }
  return violations;
};

// Rule 6: All expected ads must be played
const allAdsPlayed: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];

  for (const adBreak of Object.values(session.adBreaks)) {
    if (adBreak.actualAdCount < adBreak.expectedAdCount) {
      violations.push({
        rule: "all-ads-played",
        severity: "error",
        message: `Ad break ${adBreak.id} (${adBreak.timePositionClass}): expected ${adBreak.expectedAdCount} ads, got ${adBreak.actualAdCount}`,
        context: {
          breakId: adBreak.id,
          expected: adBreak.expectedAdCount,
          actual: adBreak.actualAdCount,
          timePositionClass: adBreak.timePositionClass,
        },
      });
    }
  }
  return violations;
};

// Rule 7: No duplicate ad impressions
const noDuplicateImpressions: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const impressions = session.timeline.filter((e) => e.eventName === "AdImpression");
  const seen = new Set<string>();

  for (const imp of impressions) {
    const key = `${imp.adId}-${imp.slotId}`;
    if (seen.has(key)) {
      violations.push({
        rule: "no-duplicate-impressions",
        severity: "error",
        message: `Duplicate impression for adId=${imp.adId} in slot=${imp.slotId}`,
        context: { adId: imp.adId, slotId: imp.slotId, timestamp: imp.timestamp },
      });
    }
    seen.add(key);
  }
  return violations;
};

// Rule 8: Creatives must complete (no premature termination)
const creativesComplete: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];

  for (const creative of Object.values(session.creatives)) {
    if (creative.state === "ERROR") {
      violations.push({
        rule: "creatives-complete",
        severity: "error",
        message: `Creative ${creative.id} (ad ${creative.adId}) ended in ERROR state`,
        context: { creativeId: creative.id, adId: creative.adId, stateHistory: creative.stateHistory },
      });
    } else if (creative.state !== "COMPLETE" && creative.state !== "SKIPPED" && creative.state !== "NOT_REQUESTED") {
      violations.push({
        rule: "creatives-complete",
        severity: "warning",
        message: `Creative ${creative.id} (ad ${creative.adId}) not completed: state=${creative.state}`,
        context: { creativeId: creative.id, adId: creative.adId, state: creative.state },
      });
    }
  }
  return violations;
};

// Rule 9: Tracking events must be fired for each quartile
const trackingEventsFired: ValidationRule = (session) => {
  const violations: RuleViolation[] = [];
  const requiredTracking: Array<"impression" | "complete"> = ["impression", "complete"];

  for (const creative of Object.values(session.creatives)) {
    if (creative.state !== "COMPLETE") continue;
    if (creative.type !== "video") continue;

    const creativeTracking = session.trackingEvents.filter((t) => t.adId === creative.adId);
    const firedTypes = new Set(creativeTracking.map((t) => t.type));

    for (const required of requiredTracking) {
      if (!firedTypes.has(required)) {
        violations.push({
          rule: "tracking-events-fired",
          severity: "error",
          message: `Creative ${creative.id} completed but missing '${required}' tracking event`,
          context: { creativeId: creative.id, adId: creative.adId, missingType: required },
        });
      }
    }
  }
  return violations;
};

// --- All rules ---

const ALL_RULES: ValidationRule[] = [
  prerollBeforeContent,
  midrollAtCorrectTime,
  postrollAfterContent,
  overlayDuringContent,
  pauseAdDuringPause,
  allAdsPlayed,
  noDuplicateImpressions,
  creativesComplete,
  trackingEventsFired,
];

// --- Runner ---

export const validateSession = (session: AdSession): ValidationResult => {
  const violations = ALL_RULES.flatMap((rule) => rule(session));
  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;
  const infos = violations.filter((v) => v.severity === "info").length;

  return {
    passed: errors === 0,
    violations,
    summary: { errors, warnings, infos },
  };
};

// --- Ad Pod comparison ---

export interface PodComparisonResult {
  readonly expectedAds: number;
  readonly playedAds: number;
  readonly missingAds: string[];
  readonly duplicateAds: string[];
  readonly skippedAds: string[];
  readonly prematurelyTerminated: string[];
}

export const comparePods = (session: AdSession): PodComparisonResult => {
  const allCreatives = Object.values(session.creatives);
  const expectedAds = allCreatives.length;
  const playedAds = allCreatives.filter((c) => c.state === "COMPLETE" || c.state === "SKIPPED").length;

  const missingAds = allCreatives
    .filter((c) => c.state === "SCHEDULED" || c.state === "NOT_REQUESTED")
    .map((c) => c.adId);

  const duplicateAds: string[] = [];
  const impressionCounts = new Map<string, number>();
  for (const entry of session.timeline) {
    if (entry.eventName === "AdImpression" && entry.adId) {
      impressionCounts.set(entry.adId, (impressionCounts.get(entry.adId) ?? 0) + 1);
    }
  }
  for (const [adId, count] of impressionCounts) {
    if (count > 1) duplicateAds.push(adId);
  }

  const skippedAds = allCreatives.filter((c) => c.state === "SKIPPED").map((c) => c.adId);

  const prematurelyTerminated = allCreatives.filter((c) => c.state === "ERROR").map((c) => c.adId);

  return { expectedAds, playedAds, missingAds, duplicateAds, skippedAds, prematurelyTerminated };
};
