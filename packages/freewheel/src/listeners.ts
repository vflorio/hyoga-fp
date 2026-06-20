import type { Logger } from "@hyoga-fp/core";
import { IO, type PlayerEvents, pipe } from ".";
import type * as FreeWheel from "./freewheel";

// Core handlers: drive the ad delivery state machine

export interface CoreHandlers {
  readonly onSlotStarted: (event: { slot: FreeWheel.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FreeWheel.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

// Diagnostic handlers: log SDK events for observability, don't drive ad flow

export interface DiagnosticHandlers {
  readonly onAdImpression: (event: any) => void;
  readonly onAdImpressionEnd: (event: any) => void;
  readonly onAdClick: (event: any) => void;
  readonly onAdError: (event: any) => void;
  readonly onAdFirstQuartile: (event: any) => void;
  readonly onAdMidpoint: (event: any) => void;
  readonly onAdThirdQuartile: (event: any) => void;
  readonly onAdComplete: (event: any) => void;
  readonly onAdInitiated: (event: any) => void;
  readonly onAdSkipped: (event: any) => void;
  readonly onAdProgress: (event: any) => void;
  readonly onAdMute: (event: any) => void;
  readonly onAdUnmute: (event: any) => void;
  readonly onAdPause: (event: any) => void;
  readonly onAdResume: (event: any) => void;
  readonly onAdRewind: (event: any) => void;
  readonly onAdCollapse: (event: any) => void;
  readonly onAdExpand: (event: any) => void;
  readonly onAdAcceptInvitation: (event: any) => void;
  readonly onAdClose: (event: any) => void;
  readonly onAdMinimize: (event: any) => void;
  readonly onAdVolumeChange: (event: any) => void;
  readonly onAdAutoPlayBlocked: (event: any) => void;
  readonly onAdSkippableStateChanged: (event: any) => void;
  readonly onAdBufferingStart: (event: any) => void;
  readonly onAdBufferingEnd: (event: any) => void;
  readonly onAdMeasurement: (event: any) => void;
  readonly onSlotImpression: (event: any) => void;
  readonly onSlotEnd: (event: any) => void;
  readonly onContentVideoPaused: (event: any) => void;
  readonly onContentVideoResumed: (event: any) => void;
  readonly onRequestInitiated: (event: any) => void;
  readonly onResellerNoAd: (event: any) => void;
  readonly onExtensionLoaded: (event: any) => void;
  readonly onVideoDisplayBaseChanged: (event: any) => void;
}

const extractAdId = (event: any): string => event?.adInstance?.getAdId?.() ?? event?.adId ?? "unknown";

const extractSlotInfo = (event: any): string =>
  event?.slot
    ? `customId=${event.slot.getCustomId?.() ?? "?"}, tpc=${event.slot.getTimePositionClass?.() ?? "?"}, adCount=${event.slot.getAdCount?.() ?? "?"}`
    : "no slot info";

export const createDiagnosticHandlers = (deps: {
  readonly logger: Logger;
  readonly events: PlayerEvents;
}): DiagnosticHandlers => {
  const { logger, events } = deps;

  const logEvent = (name: string, data?: Record<string, unknown>) =>
    data ? logger.debug(`[SDK] ${name}`, data)() : logger.debug(`[SDK] ${name}`)();

  return {
    onAdImpression: (event) => {
      logEvent("AD_IMPRESSION", { adId: extractAdId(event) });
    },
    onAdImpressionEnd: (event) => {
      logEvent("AD_IMPRESSION_END", { adId: extractAdId(event) });
    },
    onAdClick: (event) => {
      const url = event?.url ?? "unknown";
      pipe(
        logger.info(`[SDK] AD_CLICK: url=${url}`),
        IO.flatMap(() => events.onAdClick(url)),
      )();
    },
    onAdError: (event) => {
      logger.error(
        `[SDK] ERROR: code=${event?.errorCode ?? "?"}, info=${event?.errorInfo ?? "?"}, module=${event?.errorModule ?? "?"}`,
      )();
    },
    onAdFirstQuartile: (event) => {
      logEvent("AD_FIRST_QUARTILE", { adId: extractAdId(event) });
    },
    onAdMidpoint: (event) => {
      logEvent("AD_MIDPOINT", { adId: extractAdId(event) });
    },
    onAdThirdQuartile: (event) => {
      logEvent("AD_THIRD_QUARTILE", { adId: extractAdId(event) });
    },
    onAdComplete: (event) => {
      logEvent("AD_COMPLETE", { adId: extractAdId(event) });
    },
    onAdInitiated: (event) => {
      logEvent("AD_INITIATED", { adId: extractAdId(event) });
    },
    onAdSkipped: (event) => {
      logEvent("AD_SKIPPED", { adId: extractAdId(event) });
    },
    onAdProgress: (event) => {
      logEvent("AD_PROGRESS", { adId: extractAdId(event), time: event?.playheadTime ?? "?" });
    },
    onAdMute: (event) => {
      logEvent("AD_MUTE", { adId: extractAdId(event) });
    },
    onAdUnmute: (event) => {
      logEvent("AD_UNMUTE", { adId: extractAdId(event) });
    },
    onAdPause: (event) => {
      logEvent("AD_PAUSE", { adId: extractAdId(event) });
    },
    onAdResume: (event) => {
      logEvent("AD_RESUME", { adId: extractAdId(event) });
    },
    onAdRewind: (event) => {
      logEvent("AD_REWIND", { adId: extractAdId(event) });
    },
    onAdCollapse: (event) => {
      logEvent("AD_COLLAPSE", { adId: extractAdId(event) });
    },
    onAdExpand: (event) => {
      logEvent("AD_EXPAND", { adId: extractAdId(event) });
    },
    onAdAcceptInvitation: (event) => {
      logEvent("AD_ACCEPT_INVITATION", { adId: extractAdId(event) });
    },
    onAdClose: (event) => {
      logEvent("AD_CLOSE", { adId: extractAdId(event) });
    },
    onAdMinimize: (event) => {
      logEvent("AD_MINIMIZE", { adId: extractAdId(event) });
    },
    onAdVolumeChange: (event) => {
      logEvent("AD_VOLUME_CHANGE", { adId: extractAdId(event), volume: event?.volume ?? "?" });
    },
    onAdAutoPlayBlocked: (event) => {
      logger.warn(`[SDK] AD_AUTO_PLAY_BLOCKED`, { adId: extractAdId(event) })();
    },
    onAdSkippableStateChanged: (event) => {
      logEvent("AD_SKIPPABLE_STATE_CHANGED", { adId: extractAdId(event), skippable: event?.skippableState ?? "?" });
    },
    onAdBufferingStart: (event) => {
      logEvent("AD_BUFFERING_START", { adId: extractAdId(event) });
    },
    onAdBufferingEnd: (event) => {
      logEvent("AD_BUFFERING_END", { adId: extractAdId(event) });
    },
    onAdMeasurement: (event) => {
      logEvent("AD_MEASUREMENT", { adId: extractAdId(event), eventId: event?.concreteEventId ?? "?" });
    },
    onSlotImpression: (event) => {
      logEvent("SLOT_IMPRESSION", { slot: extractSlotInfo(event) });
    },
    onSlotEnd: (event) => {
      logEvent("SLOT_END", { slot: extractSlotInfo(event) });
    },
    onContentVideoPaused: () => {
      logEvent("CONTENT_VIDEO_PAUSED");
    },
    onContentVideoResumed: () => {
      logEvent("CONTENT_VIDEO_RESUMED");
    },
    onRequestInitiated: (event) => {
      logEvent("REQUEST_INITIATED", { url: event?.url ?? "?" });
    },
    onResellerNoAd: (event) => {
      logEvent("RESELLER_NO_AD", { adId: extractAdId(event) });
    },
    onExtensionLoaded: (event) => {
      logEvent("EXTENSION_LOADED", { type: event?.moduleType ?? "?", id: event?.customId ?? "?" });
    },
    onVideoDisplayBaseChanged: (event) => {
      logEvent("VIDEO_DISPLAY_BASE_CHANGED", { id: event?.id ?? "?" });
    },
  };
};

export const registerListeners =
  (
    adContext: FreeWheel.AdContext,
    SDK: FreeWheel.SDK,
    core: CoreHandlers,
    diagnostic: DiagnosticHandlers,
  ): IO.IO<void> =>
  () => {
    // Core: drive the ad delivery flow
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
    // Diagnostic: ad lifecycle
    adContext.addEventListener(SDK.EVENT_AD_INITIATED, diagnostic.onAdInitiated);
    adContext.addEventListener(SDK.EVENT_AD_IMPRESSION, diagnostic.onAdImpression);
    adContext.addEventListener(SDK.EVENT_AD_IMPRESSION_END, diagnostic.onAdImpressionEnd);
    adContext.addEventListener(SDK.EVENT_AD_FIRST_QUARTILE, diagnostic.onAdFirstQuartile);
    adContext.addEventListener(SDK.EVENT_AD_MIDPOINT, diagnostic.onAdMidpoint);
    adContext.addEventListener(SDK.EVENT_AD_THIRD_QUARTILE, diagnostic.onAdThirdQuartile);
    adContext.addEventListener(SDK.EVENT_AD_COMPLETE, diagnostic.onAdComplete);
    adContext.addEventListener(SDK.EVENT_AD_SKIPPED, diagnostic.onAdSkipped);
    adContext.addEventListener(SDK.EVENT_AD_PROGRESS, diagnostic.onAdProgress);
    // Diagnostic: user interactions
    adContext.addEventListener(SDK.EVENT_AD_CLICK, diagnostic.onAdClick);
    adContext.addEventListener(SDK.EVENT_AD_MUTE, diagnostic.onAdMute);
    adContext.addEventListener(SDK.EVENT_AD_UNMUTE, diagnostic.onAdUnmute);
    adContext.addEventListener(SDK.EVENT_AD_PAUSE, diagnostic.onAdPause);
    adContext.addEventListener(SDK.EVENT_AD_RESUME, diagnostic.onAdResume);
    adContext.addEventListener(SDK.EVENT_AD_REWIND, diagnostic.onAdRewind);
    adContext.addEventListener(SDK.EVENT_AD_COLLAPSE, diagnostic.onAdCollapse);
    adContext.addEventListener(SDK.EVENT_AD_EXPAND, diagnostic.onAdExpand);
    adContext.addEventListener(SDK.EVENT_AD_ACCEPT_INVITATION, diagnostic.onAdAcceptInvitation);
    adContext.addEventListener(SDK.EVENT_AD_CLOSE, diagnostic.onAdClose);
    adContext.addEventListener(SDK.EVENT_AD_MINIMIZE, diagnostic.onAdMinimize);
    adContext.addEventListener(SDK.EVENT_AD_VOLUME_CHANGE, diagnostic.onAdVolumeChange);
    adContext.addEventListener(SDK.EVENT_AD_SKIPPABLE_STATE_CHANGED, diagnostic.onAdSkippableStateChanged);
    // Diagnostic: playback health
    adContext.addEventListener(SDK.EVENT_AD_AUTO_PLAY_BLOCKED, diagnostic.onAdAutoPlayBlocked);
    adContext.addEventListener(SDK.EVENT_AD_BUFFERING_START, diagnostic.onAdBufferingStart);
    adContext.addEventListener(SDK.EVENT_AD_BUFFERING_END, diagnostic.onAdBufferingEnd);
    adContext.addEventListener(SDK.EVENT_AD_MEASUREMENT, diagnostic.onAdMeasurement);
    // Diagnostic: slot lifecycle
    adContext.addEventListener(SDK.EVENT_SLOT_IMPRESSION, diagnostic.onSlotImpression);
    adContext.addEventListener(SDK.EVENT_SLOT_END, diagnostic.onSlotEnd);
    // Diagnostic: content video state (SDK-reported)
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSED, diagnostic.onContentVideoPaused);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUMED, diagnostic.onContentVideoResumed);
    // Diagnostic: request and infrastructure
    adContext.addEventListener(SDK.EVENT_REQUEST_INITIATED, diagnostic.onRequestInitiated);
    adContext.addEventListener(SDK.EVENT_RESELLER_NO_AD, diagnostic.onResellerNoAd);
    adContext.addEventListener(SDK.EVENT_EXTENSION_LOADED, diagnostic.onExtensionLoaded);
    adContext.addEventListener(SDK.EVENT_VIDEO_DISPLAY_BASE_CHANGED, diagnostic.onVideoDisplayBaseChanged);
    adContext.addEventListener(SDK.EVENT_ERROR, diagnostic.onAdError);
  };

export const removeListeners =
  (
    adContext: FreeWheel.AdContext,
    SDK: FreeWheel.SDK,
    core: CoreHandlers,
    diagnostic: DiagnosticHandlers,
  ): IO.IO<void> =>
  () => {
    // Core
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
    // Diagnostic: ad lifecycle
    adContext.removeEventListener(SDK.EVENT_AD_INITIATED, diagnostic.onAdInitiated);
    adContext.removeEventListener(SDK.EVENT_AD_IMPRESSION, diagnostic.onAdImpression);
    adContext.removeEventListener(SDK.EVENT_AD_IMPRESSION_END, diagnostic.onAdImpressionEnd);
    adContext.removeEventListener(SDK.EVENT_AD_FIRST_QUARTILE, diagnostic.onAdFirstQuartile);
    adContext.removeEventListener(SDK.EVENT_AD_MIDPOINT, diagnostic.onAdMidpoint);
    adContext.removeEventListener(SDK.EVENT_AD_THIRD_QUARTILE, diagnostic.onAdThirdQuartile);
    adContext.removeEventListener(SDK.EVENT_AD_COMPLETE, diagnostic.onAdComplete);
    adContext.removeEventListener(SDK.EVENT_AD_SKIPPED, diagnostic.onAdSkipped);
    adContext.removeEventListener(SDK.EVENT_AD_PROGRESS, diagnostic.onAdProgress);
    // Diagnostic: user interactions
    adContext.removeEventListener(SDK.EVENT_AD_CLICK, diagnostic.onAdClick);
    adContext.removeEventListener(SDK.EVENT_AD_MUTE, diagnostic.onAdMute);
    adContext.removeEventListener(SDK.EVENT_AD_UNMUTE, diagnostic.onAdUnmute);
    adContext.removeEventListener(SDK.EVENT_AD_PAUSE, diagnostic.onAdPause);
    adContext.removeEventListener(SDK.EVENT_AD_RESUME, diagnostic.onAdResume);
    adContext.removeEventListener(SDK.EVENT_AD_REWIND, diagnostic.onAdRewind);
    adContext.removeEventListener(SDK.EVENT_AD_COLLAPSE, diagnostic.onAdCollapse);
    adContext.removeEventListener(SDK.EVENT_AD_EXPAND, diagnostic.onAdExpand);
    adContext.removeEventListener(SDK.EVENT_AD_ACCEPT_INVITATION, diagnostic.onAdAcceptInvitation);
    adContext.removeEventListener(SDK.EVENT_AD_CLOSE, diagnostic.onAdClose);
    adContext.removeEventListener(SDK.EVENT_AD_MINIMIZE, diagnostic.onAdMinimize);
    adContext.removeEventListener(SDK.EVENT_AD_VOLUME_CHANGE, diagnostic.onAdVolumeChange);
    adContext.removeEventListener(SDK.EVENT_AD_SKIPPABLE_STATE_CHANGED, diagnostic.onAdSkippableStateChanged);
    // Diagnostic: playback health
    adContext.removeEventListener(SDK.EVENT_AD_AUTO_PLAY_BLOCKED, diagnostic.onAdAutoPlayBlocked);
    adContext.removeEventListener(SDK.EVENT_AD_BUFFERING_START, diagnostic.onAdBufferingStart);
    adContext.removeEventListener(SDK.EVENT_AD_BUFFERING_END, diagnostic.onAdBufferingEnd);
    adContext.removeEventListener(SDK.EVENT_AD_MEASUREMENT, diagnostic.onAdMeasurement);
    // Diagnostic: slot lifecycle
    adContext.removeEventListener(SDK.EVENT_SLOT_IMPRESSION, diagnostic.onSlotImpression);
    adContext.removeEventListener(SDK.EVENT_SLOT_END, diagnostic.onSlotEnd);
    // Diagnostic: content video state
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSED, diagnostic.onContentVideoPaused);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUMED, diagnostic.onContentVideoResumed);
    // Diagnostic: request and infrastructure
    adContext.removeEventListener(SDK.EVENT_REQUEST_INITIATED, diagnostic.onRequestInitiated);
    adContext.removeEventListener(SDK.EVENT_RESELLER_NO_AD, diagnostic.onResellerNoAd);
    adContext.removeEventListener(SDK.EVENT_EXTENSION_LOADED, diagnostic.onExtensionLoaded);
    adContext.removeEventListener(SDK.EVENT_VIDEO_DISPLAY_BASE_CHANGED, diagnostic.onVideoDisplayBaseChanged);
    adContext.removeEventListener(SDK.EVENT_ERROR, diagnostic.onAdError);
  };
