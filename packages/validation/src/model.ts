// Unified Ad Model Types for runtime validation

// --- Position types ---

export type TimePositionClass = "PREROLL" | "MIDROLL" | "POSTROLL" | "OVERLAY" | "PAUSE_MIDROLL";

// --- Creative lifecycle state ---

export type CreativeLifecycleState =
  | "NOT_REQUESTED"
  | "REQUESTED"
  | "RESPONSE_RECEIVED"
  | "SCHEDULED"
  | "RENDERED"
  | "VISIBLE"
  | "STARTED"
  | "FIRST_QUARTILE"
  | "MIDPOINT"
  | "THIRD_QUARTILE"
  | "COMPLETE"
  | "SKIPPED"
  | "ERROR";

// --- Tracking ---

export type TrackingEventType =
  | "impression"
  | "firstQuartile"
  | "midpoint"
  | "thirdQuartile"
  | "complete"
  | "click"
  | "skip"
  | "error"
  | "pause"
  | "resume"
  | "mute"
  | "unmute"
  | "custom";

export interface TrackingEvent {
  readonly type: TrackingEventType;
  readonly timestamp: number;
  readonly url?: string;
  readonly adId: string;
  readonly creativeId?: string;
  readonly slotId: string;
  readonly networkCorrelated: boolean;
}

// --- Creative ---

export type CreativeType = "video" | "banner" | "companion" | "overlay";

export interface Creative {
  readonly id: string;
  readonly adId: string;
  readonly slotId: string;
  readonly type: CreativeType;
  readonly duration: number | null; // null for non-temporal (banners)
  readonly width: number | null;
  readonly height: number | null;
  readonly state: CreativeLifecycleState;
  readonly stateHistory: ReadonlyArray<StateTransition>;
  readonly trackingEvents: TrackingEvent[];
}

export interface StateTransition {
  readonly from: CreativeLifecycleState;
  readonly to: CreativeLifecycleState;
  readonly timestamp: number;
}

// --- Companion ---

export interface Companion {
  readonly id: string;
  readonly adId: string;
  readonly slotId: string;
  readonly width: number;
  readonly height: number;
  readonly containerId: string;
  readonly rendered: boolean;
  readonly visible: boolean;
  readonly timestamp: number;
}

// --- Ad Slot ---

export interface AdSlotRecord {
  readonly id: string;
  readonly customId: string;
  readonly timePositionClass: TimePositionClass;
  readonly timePosition: number; // seconds from start
  readonly adCount: number;
  readonly creatives: string[]; // creative ids
  readonly companions: string[]; // companion ids
  readonly started: boolean;
  readonly ended: boolean;
  readonly startTimestamp: number | null;
  readonly endTimestamp: number | null;
}

// --- Ad Break ---

export interface AdBreak {
  readonly id: string;
  readonly timePositionClass: TimePositionClass;
  readonly timePosition: number;
  readonly slots: string[]; // slot ids
  readonly expectedAdCount: number;
  readonly actualAdCount: number;
  readonly startTimestamp: number | null;
  readonly endTimestamp: number | null;
}

// --- Ad Pod (group of breaks at same position) ---

export interface AdPod {
  readonly id: string;
  readonly timePositionClass: TimePositionClass;
  readonly breaks: string[]; // break ids
}

// --- Timeline entry ---

export interface TimelineEntry {
  readonly timestamp: number;
  readonly eventName: string;
  readonly slotId: string | null;
  readonly adId: string | null;
  readonly creativeId: string | null;
  readonly phase: string | null;
  readonly rawPayload?: unknown;
}

// --- Network request tracking ---

export type NetworkRequestType =
  | "ad_request"
  | "impression"
  | "firstQuartile"
  | "midpoint"
  | "thirdQuartile"
  | "complete"
  | "click"
  | "custom";

export interface NetworkRequest {
  readonly url: string;
  readonly type: NetworkRequestType;
  readonly timestamp: number;
  readonly adId: string | null;
  readonly creativeId: string | null;
  readonly slotId: string | null;
  readonly statusCode: number | null;
  readonly correlated: boolean;
}

// --- Session ---

export interface AdSession {
  readonly sessionId: string;
  readonly startTimestamp: number;
  readonly endTimestamp: number | null;
  readonly adPods: Record<string, AdPod>;
  readonly adBreaks: Record<string, AdBreak>;
  readonly slots: Record<string, AdSlotRecord>;
  readonly creatives: Record<string, Creative>;
  readonly companions: Record<string, Companion>;
  readonly trackingEvents: TrackingEvent[];
  readonly networkRequests: NetworkRequest[];
  readonly timeline: TimelineEntry[];
}

// --- Factory ---

export const createAdSession = (sessionId: string): AdSession => ({
  sessionId,
  startTimestamp: Date.now(),
  endTimestamp: null,
  adPods: {},
  adBreaks: {},
  slots: {},
  creatives: {},
  companions: {},
  trackingEvents: [],
  networkRequests: [],
  timeline: [],
});
