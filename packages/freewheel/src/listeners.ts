import type { Logger } from "@hyoga-fp/core";
import type * as IO from "fp-ts/IO";
import type * as FreeWheel from "./freewheel";
import type * as Model from "./model";

// Core Handlers (drive ad delivery state machine)

export interface CoreHandlers {
  readonly onSlotStarted: (event: { slot: FreeWheel.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FreeWheel.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

export const registerCoreHandlers =
  (adContext: FreeWheel.AdContext, SDK: FreeWheel.SDK, core: CoreHandlers): IO.IO<void> =>
  () => {
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
  };

export const removeCoreHandlers =
  (adContext: FreeWheel.AdContext, SDK: FreeWheel.SDK, core: CoreHandlers): IO.IO<void> =>
  () => {
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
  };

// Diagnostic Registration

interface DiagnosticDeps {
  readonly adContext: FreeWheel.AdContext;
  readonly SDK: FreeWheel.SDK;
  readonly emit: (event: Model.SDK.SDKEvent) => void;
  readonly logger: Logger;
}

export interface DiagnosticRegistration {
  readonly register: IO.IO<void>;
  readonly remove: IO.IO<void>;
}

export const createDiagnostics = (deps: DiagnosticDeps): DiagnosticRegistration => {
  const categories = [
    buildAdLifecycle(deps),
    buildUserInteractions(deps),
    buildPlaybackHealth(deps),
    buildSlotLifecycle(deps),
    buildContentState(deps),
    buildInfrastructure(deps),
  ];

  return {
    register: () => {
      for (const cat of categories) cat.register();
    },
    remove: () => {
      for (const cat of categories) cat.remove();
    },
  };
};

// Internals

const extractAdId = (event: any): string => event?.adInstance?.getAdId?.() ?? event?.adId ?? "unknown";

const dispatch = (deps: DiagnosticDeps, eventName: string, build: (raw: any) => Model.SDK.SDKEvent | null) => {
  return (raw: any): void => {
    const event = build(raw);
    if (event) {
      deps.logger.debug(`[SDK] ${event._tag}`, event)();
      deps.emit(event);
    } else {
      const ve: Model.SDK.SDKEvent = {
        _tag: "ValidationError",
        eventName,
        rawPayload: raw,
        reason: "Unexpected payload shape",
      };
      deps.logger.warn(`[SDK] ValidationError on ${eventName}`, raw)();
      deps.emit(ve);
    }
  };
};

type CategoryPair = { register: () => void; remove: () => void };

// Category: Ad Lifecycle

const buildAdLifecycle = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const h = {
    onAdInitiated: dispatch(deps, "AD_INITIATED", (e) => ({ _tag: "AdInitiated", adId: extractAdId(e) })),
    onAdImpression: dispatch(deps, "AD_IMPRESSION", (e) => ({ _tag: "AdImpression", adId: extractAdId(e) })),
    onAdImpressionEnd: dispatch(deps, "AD_IMPRESSION_END", (e) => ({ _tag: "AdImpressionEnd", adId: extractAdId(e) })),
    onAdFirstQuartile: dispatch(deps, "AD_FIRST_QUARTILE", (e) => ({ _tag: "AdFirstQuartile", adId: extractAdId(e) })),
    onAdMidpoint: dispatch(deps, "AD_MIDPOINT", (e) => ({ _tag: "AdMidpoint", adId: extractAdId(e) })),
    onAdThirdQuartile: dispatch(deps, "AD_THIRD_QUARTILE", (e) => ({ _tag: "AdThirdQuartile", adId: extractAdId(e) })),
    onAdComplete: dispatch(deps, "AD_COMPLETE", (e) => ({ _tag: "AdComplete", adId: extractAdId(e) })),
    onAdSkipped: dispatch(deps, "AD_SKIPPED", (e) => ({ _tag: "AdSkipped", adId: extractAdId(e) })),
    onAdProgress: dispatch(deps, "AD_PROGRESS", (e) => {
      const time = typeof e?.playheadTime === "number" ? e.playheadTime : NaN;
      return Number.isFinite(time) ? { _tag: "AdProgress", adId: extractAdId(e), time } : null;
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_AD_INITIATED, h.onAdInitiated],
    [SDK.EVENT_AD_IMPRESSION, h.onAdImpression],
    [SDK.EVENT_AD_IMPRESSION_END, h.onAdImpressionEnd],
    [SDK.EVENT_AD_FIRST_QUARTILE, h.onAdFirstQuartile],
    [SDK.EVENT_AD_MIDPOINT, h.onAdMidpoint],
    [SDK.EVENT_AD_THIRD_QUARTILE, h.onAdThirdQuartile],
    [SDK.EVENT_AD_COMPLETE, h.onAdComplete],
    [SDK.EVENT_AD_SKIPPED, h.onAdSkipped],
    [SDK.EVENT_AD_PROGRESS, h.onAdProgress],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};

// Category: User Interactions

const buildUserInteractions = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const h = {
    onAdClick: dispatch(deps, "AD_CLICK", (e) => {
      const url = e?.url;
      return typeof url === "string" ? { _tag: "AdClick", url } : null;
    }),
    onAdMute: dispatch(deps, "AD_MUTE", (e) => ({ _tag: "AdMute", adId: extractAdId(e) })),
    onAdUnmute: dispatch(deps, "AD_UNMUTE", (e) => ({ _tag: "AdUnmute", adId: extractAdId(e) })),
    onAdPause: dispatch(deps, "AD_PAUSE", (e) => ({ _tag: "AdPause", adId: extractAdId(e) })),
    onAdResume: dispatch(deps, "AD_RESUME", (e) => ({ _tag: "AdResume", adId: extractAdId(e) })),
    onAdRewind: dispatch(deps, "AD_REWIND", (e) => ({ _tag: "AdRewind", adId: extractAdId(e) })),
    onAdCollapse: dispatch(deps, "AD_COLLAPSE", (e) => ({ _tag: "AdCollapse", adId: extractAdId(e) })),
    onAdExpand: dispatch(deps, "AD_EXPAND", (e) => ({ _tag: "AdExpand", adId: extractAdId(e) })),
    onAdAcceptInvitation: dispatch(deps, "AD_ACCEPT_INVITATION", (e) => ({
      _tag: "AdAcceptInvitation",
      adId: extractAdId(e),
    })),
    onAdClose: dispatch(deps, "AD_CLOSE", (e) => ({ _tag: "AdClose", adId: extractAdId(e) })),
    onAdMinimize: dispatch(deps, "AD_MINIMIZE", (e) => ({ _tag: "AdMinimize", adId: extractAdId(e) })),
    onAdVolumeChange: dispatch(deps, "AD_VOLUME_CHANGE", (e) => {
      const volume = typeof e?.volume === "number" ? e.volume : NaN;
      return Number.isFinite(volume) ? { _tag: "AdVolumeChange", adId: extractAdId(e), volume } : null;
    }),
    onAdSkippableStateChanged: dispatch(deps, "AD_SKIPPABLE_STATE_CHANGED", (e) => {
      const skippable = typeof e?.skippableState === "boolean" ? e.skippableState : null;
      return skippable !== null ? { _tag: "AdSkippableStateChanged", adId: extractAdId(e), skippable } : null;
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_AD_CLICK, h.onAdClick],
    [SDK.EVENT_AD_MUTE, h.onAdMute],
    [SDK.EVENT_AD_UNMUTE, h.onAdUnmute],
    [SDK.EVENT_AD_PAUSE, h.onAdPause],
    [SDK.EVENT_AD_RESUME, h.onAdResume],
    [SDK.EVENT_AD_REWIND, h.onAdRewind],
    [SDK.EVENT_AD_COLLAPSE, h.onAdCollapse],
    [SDK.EVENT_AD_EXPAND, h.onAdExpand],
    [SDK.EVENT_AD_ACCEPT_INVITATION, h.onAdAcceptInvitation],
    [SDK.EVENT_AD_CLOSE, h.onAdClose],
    [SDK.EVENT_AD_MINIMIZE, h.onAdMinimize],
    [SDK.EVENT_AD_VOLUME_CHANGE, h.onAdVolumeChange],
    [SDK.EVENT_AD_SKIPPABLE_STATE_CHANGED, h.onAdSkippableStateChanged],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};

// Category: Playback Health

const buildPlaybackHealth = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const h = {
    onAdAutoPlayBlocked: dispatch(deps, "AD_AUTO_PLAY_BLOCKED", (e) => ({
      _tag: "AdAutoPlayBlocked",
      adId: extractAdId(e),
    })),
    onAdBufferingStart: dispatch(deps, "AD_BUFFERING_START", (e) => ({
      _tag: "AdBufferingStart",
      adId: extractAdId(e),
    })),
    onAdBufferingEnd: dispatch(deps, "AD_BUFFERING_END", (e) => ({
      _tag: "AdBufferingEnd",
      adId: extractAdId(e),
    })),
    onAdMeasurement: dispatch(deps, "AD_MEASUREMENT", (e) => {
      const eventId = typeof e?.concreteEventId === "string" ? e.concreteEventId : "unknown";
      return { _tag: "AdMeasurement", adId: extractAdId(e), eventId };
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_AD_AUTO_PLAY_BLOCKED, h.onAdAutoPlayBlocked],
    [SDK.EVENT_AD_BUFFERING_START, h.onAdBufferingStart],
    [SDK.EVENT_AD_BUFFERING_END, h.onAdBufferingEnd],
    [SDK.EVENT_AD_MEASUREMENT, h.onAdMeasurement],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};

// Category: Slot Lifecycle
const buildSlotLifecycle = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const extractSlot = (e: any): { customId: string; timePositionClass: string; adCount: number } | null => {
    const slot = e?.slot;
    if (!slot) return null;
    return {
      customId: slot.getCustomId?.() ?? "unknown",
      timePositionClass: slot.getTimePositionClass?.() ?? "unknown",
      adCount: typeof slot.getAdCount === "function" ? slot.getAdCount() : 0,
    };
  };

  const h = {
    onSlotImpression: dispatch(deps, "SLOT_IMPRESSION", (e) => {
      const s = extractSlot(e);
      return s ? { _tag: "SlotImpression", ...s } : null;
    }),
    onSlotEnd: dispatch(deps, "SLOT_END", (e) => {
      const s = extractSlot(e);
      return s ? { _tag: "SlotEnd", ...s } : null;
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_SLOT_IMPRESSION, h.onSlotImpression],
    [SDK.EVENT_SLOT_END, h.onSlotEnd],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};

// Category: Content State

const buildContentState = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const h = {
    onContentVideoPaused: dispatch(deps, "CONTENT_VIDEO_PAUSED", () => ({ _tag: "ContentVideoPaused" })),
    onContentVideoResumed: dispatch(deps, "CONTENT_VIDEO_RESUMED", () => ({ _tag: "ContentVideoResumed" })),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_CONTENT_VIDEO_PAUSED, h.onContentVideoPaused],
    [SDK.EVENT_CONTENT_VIDEO_RESUMED, h.onContentVideoResumed],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};

// Category: Infrastructure
const buildInfrastructure = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const h = {
    onRequestInitiated: dispatch(deps, "REQUEST_INITIATED", () => ({ _tag: "RequestInitiated" })),
    onResellerNoAd: dispatch(deps, "RESELLER_NO_AD", (e) => ({ _tag: "ResellerNoAd", adId: extractAdId(e) })),
    onExtensionLoaded: dispatch(deps, "EXTENSION_LOADED", (e) => {
      const moduleType = typeof e?.moduleType === "string" ? e.moduleType : "unknown";
      const customId = typeof e?.customId === "string" ? e.customId : "unknown";
      return { _tag: "ExtensionLoaded", moduleType, customId };
    }),
    onVideoDisplayBaseChanged: dispatch(deps, "VIDEO_DISPLAY_BASE_CHANGED", () => ({
      _tag: "VideoDisplayBaseChanged",
    })),
    onAdError: dispatch(deps, "ERROR", (e) => ({
      _tag: "AdError",
      errorCode: e?.errorCode ?? "unknown",
      errorInfo: e?.errorInfo ?? "unknown",
      errorModule: e?.errorModule ?? "unknown",
    })),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_REQUEST_INITIATED, h.onRequestInitiated],
    [SDK.EVENT_RESELLER_NO_AD, h.onResellerNoAd],
    [SDK.EVENT_EXTENSION_LOADED, h.onExtensionLoaded],
    [SDK.EVENT_VIDEO_DISPLAY_BASE_CHANGED, h.onVideoDisplayBaseChanged],
    [SDK.EVENT_ERROR, h.onAdError],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
