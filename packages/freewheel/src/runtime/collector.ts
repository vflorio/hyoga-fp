// AdRuntimeCollector
// Subscribes to SDK events and state changes, builds the unified AdSession model in real-time

import type {
  AdBreak,
  AdSession,
  AdSlotRecord,
  Creative,
  CreativeLifecycleState,
  StateMachineInstance,
  TimelineEntry,
  TimePositionClass,
  TrackingEvent,
} from "@hyoga-fp/validation";
import { createAdSession, createStateMachine, transition } from "@hyoga-fp/validation";
import type { PlayerState } from "../contextRunner/state";
import type { Model } from "../freeWheel";

export interface AdRuntimeState {
  readonly session: AdSession;
  readonly stateMachines: Record<string, StateMachineInstance>;
}

export interface AdRuntimeCollector {
  readonly getState: () => AdRuntimeState;
  readonly getSession: () => AdSession;
  readonly onEvent: (event: Model.SDKEvent) => void;
  readonly onStateChange: (state: PlayerState) => void;
  readonly finalize: () => AdSession;
}

export const createAdRuntimeCollector = (sessionId?: string): AdRuntimeCollector => {
  const session: AdSession = createAdSession(sessionId ?? `session-${Date.now()}`);
  const stateMachines: Record<string, StateMachineInstance> = {};

  // Mutable session state (collector mutates in place for performance)
  const state: AdRuntimeState = { session, stateMachines };

  const addTimelineEntry = (entry: TimelineEntry): void => {
    (state.session.timeline as TimelineEntry[]).push(entry);
  };

  const ensureCreative = (adId: string, slotId: string, type: Creative["type"] = "video"): void => {
    if (!state.session.creatives[adId]) {
      (state.session.creatives as Record<string, Creative>)[adId] = {
        id: adId,
        adId,
        slotId,
        type,
        duration: null,
        width: null,
        height: null,
        state: "NOT_REQUESTED",
        stateHistory: [],
        trackingEvents: [],
      };
    }
    if (!state.stateMachines[adId]) {
      state.stateMachines[adId] = createStateMachine(adId);
    }
  };

  const transitionCreative = (adId: string, to: CreativeLifecycleState): void => {
    const sm = state.stateMachines[adId];
    if (!sm) return;

    const result = transition(sm, to, Date.now());
    (state.stateMachines as Record<string, StateMachineInstance>)[adId] = result.machine;

    const creative = state.session.creatives[adId];
    if (creative) {
      (state.session.creatives as Record<string, Creative>)[adId] = {
        ...creative,
        state: to,
        stateHistory: [...creative.stateHistory, result.result.transition],
      };
    }
  };

  const addTrackingEvent = (event: TrackingEvent): void => {
    (state.session.trackingEvents as TrackingEvent[]).push(event);
  };

  const handleSlotImpression = (customId: string, timePositionClass: string, adCount: number): void => {
    const tpc = mapTimePositionClass(timePositionClass);
    const slotId = customId;

    if (!state.session.slots[slotId]) {
      (state.session.slots as Record<string, AdSlotRecord>)[slotId] = {
        id: slotId,
        customId,
        timePositionClass: tpc,
        timePosition: 0,
        adCount,
        creatives: [],
        companions: [],
        started: true,
        ended: false,
        startTimestamp: Date.now(),
        endTimestamp: null,
      };
    }

    // Ensure ad break exists
    const breakId = `break-${tpc}-${slotId}`;
    if (!state.session.adBreaks[breakId]) {
      (state.session.adBreaks as Record<string, AdBreak>)[breakId] = {
        id: breakId,
        timePositionClass: tpc,
        timePosition: 0,
        slots: [slotId],
        expectedAdCount: adCount,
        actualAdCount: 0,
        startTimestamp: Date.now(),
        endTimestamp: null,
      };
    }
  };

  const handleSlotEnd = (customId: string, _timePositionClass: string, _adCount: number): void => {
    const slot = state.session.slots[customId];
    if (slot) {
      (state.session.slots as Record<string, AdSlotRecord>)[customId] = {
        ...slot,
        ended: true,
        endTimestamp: Date.now(),
      };
    }
  };

  const onEvent = (event: Model.SDKEvent): void => {
    const now = Date.now();

    switch (event._tag) {
      // --- Slot lifecycle ---
      case "SlotImpression":
        handleSlotImpression(event.customId, event.timePositionClass, event.adCount);
        addTimelineEntry({
          timestamp: now,
          eventName: "SlotImpression",
          slotId: event.customId,
          adId: null,
          creativeId: null,
          phase: null,
        });
        break;

      case "SlotEnd":
        handleSlotEnd(event.customId, event.timePositionClass, event.adCount);
        addTimelineEntry({
          timestamp: now,
          eventName: "SlotEnd",
          slotId: event.customId,
          adId: null,
          creativeId: null,
          phase: null,
        });
        break;

      // --- Ad lifecycle ---
      case "AdInitiated":
        ensureCreative(event.adId, "");
        transitionCreative(event.adId, "SCHEDULED");
        addTimelineEntry({
          timestamp: now,
          eventName: "AdInitiated",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdImpression":
        ensureCreative(event.adId, "");
        transitionCreative(event.adId, "STARTED");
        addTrackingEvent({
          type: "impression",
          timestamp: now,
          adId: event.adId,
          slotId: "",
          networkCorrelated: false,
        });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdImpression",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        // Increment actual ad count for current break
        incrementActualAdCount(event.adId);
        break;

      case "AdFirstQuartile":
        transitionCreative(event.adId, "FIRST_QUARTILE");
        addTrackingEvent({
          type: "firstQuartile",
          timestamp: now,
          adId: event.adId,
          slotId: "",
          networkCorrelated: false,
        });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdFirstQuartile",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdMidpoint":
        transitionCreative(event.adId, "MIDPOINT");
        addTrackingEvent({ type: "midpoint", timestamp: now, adId: event.adId, slotId: "", networkCorrelated: false });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdMidpoint",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdThirdQuartile":
        transitionCreative(event.adId, "THIRD_QUARTILE");
        addTrackingEvent({
          type: "thirdQuartile",
          timestamp: now,
          adId: event.adId,
          slotId: "",
          networkCorrelated: false,
        });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdThirdQuartile",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdComplete":
        transitionCreative(event.adId, "COMPLETE");
        addTrackingEvent({ type: "complete", timestamp: now, adId: event.adId, slotId: "", networkCorrelated: false });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdComplete",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdImpressionEnd":
        addTimelineEntry({
          timestamp: now,
          eventName: "AdImpressionEnd",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdSkipped":
        transitionCreative(event.adId, "SKIPPED");
        addTrackingEvent({ type: "skip", timestamp: now, adId: event.adId, slotId: "", networkCorrelated: false });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdSkipped",
          slotId: null,
          adId: event.adId,
          creativeId: null,
          phase: null,
        });
        break;

      case "AdError":
        addTimelineEntry({
          timestamp: now,
          eventName: "AdError",
          slotId: null,
          adId: null,
          creativeId: null,
          phase: null,
          rawPayload: event,
        });
        break;

      case "AdClick":
        addTrackingEvent({
          type: "click",
          timestamp: now,
          adId: "",
          slotId: "",
          networkCorrelated: false,
          url: event.url,
        });
        addTimelineEntry({
          timestamp: now,
          eventName: "AdClick",
          slotId: null,
          adId: null,
          creativeId: null,
          phase: null,
        });
        break;

      // --- Content state ---
      case "ContentVideoPaused":
        addTimelineEntry({
          timestamp: now,
          eventName: "ContentVideoPaused",
          slotId: null,
          adId: null,
          creativeId: null,
          phase: "Content",
        });
        break;

      case "ContentVideoResumed":
        addTimelineEntry({
          timestamp: now,
          eventName: "ContentVideoResumed",
          slotId: null,
          adId: null,
          creativeId: null,
          phase: "Content",
        });
        break;

      // --- Infrastructure ---
      case "RequestInitiated":
        addTimelineEntry({
          timestamp: now,
          eventName: "RequestInitiated",
          slotId: null,
          adId: null,
          creativeId: null,
          phase: null,
        });
        break;

      case "Complete":
        (state.session as { endTimestamp: number | null }).endTimestamp = now;
        addTimelineEntry({
          timestamp: now,
          eventName: "Complete",
          slotId: null,
          adId: null,
          creativeId: null,
          phase: null,
        });
        break;

      default:
        // Other events: just log to timeline
        addTimelineEntry({
          timestamp: now,
          eventName: event._tag,
          slotId: null,
          adId: null,
          creativeId: null,
          phase: null,
        });
        break;
    }
  };

  const onStateChange = (playerState: PlayerState): void => {
    const now = Date.now();
    addTimelineEntry({
      timestamp: now,
      eventName: "StateChange",
      slotId: null,
      adId: null,
      creativeId: null,
      phase: playerState.phase._tag,
    });
  };

  const incrementActualAdCount = (_adId: string): void => {
    // Find the most recently started break and increment its count
    const breaks = Object.values(state.session.adBreaks);
    const activeBreak = breaks.find((b) => b.startTimestamp !== null && b.endTimestamp === null);
    if (activeBreak) {
      (state.session.adBreaks as Record<string, AdBreak>)[activeBreak.id] = {
        ...activeBreak,
        actualAdCount: activeBreak.actualAdCount + 1,
      };
    }
  };

  const finalize = (): AdSession => {
    if (!state.session.endTimestamp) {
      (state.session as { endTimestamp: number | null }).endTimestamp = Date.now();
    }
    return state.session;
  };

  return {
    getState: () => state,
    getSession: () => state.session,
    onEvent,
    onStateChange,
    finalize,
  };
};

// --- Helpers ---

const mapTimePositionClass = (tpc: string): TimePositionClass => {
  const upper = tpc.toUpperCase();
  switch (upper) {
    case "PREROLL":
      return "PREROLL";
    case "MIDROLL":
      return "MIDROLL";
    case "POSTROLL":
      return "POSTROLL";
    case "OVERLAY":
      return "OVERLAY";
    case "PAUSE_MIDROLL":
    case "PAUSEMIDROLL":
      return "PAUSE_MIDROLL";
    default:
      return "MIDROLL"; // fallback
  }
};
