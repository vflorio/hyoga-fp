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

// Notification handlers: log and notify the application, don't drive ad flow

export interface NotificationHandlers {
  readonly onAdImpression: (event: { adInstance?: { getAdId?: () => string } }) => void;
  readonly onAdImpressionEnd: (event: { adInstance?: { getAdId?: () => string } }) => void;
  readonly onAdClick: (event: { url?: string }) => void;
  readonly onAdError: (event: { errorInfo?: string; errorCode?: string }) => void;
}

export const createNotificationHandlers = (deps: {
  readonly logger: Logger;
  readonly events: PlayerEvents;
}): NotificationHandlers => {
  const { logger, events } = deps;

  return {
    onAdImpression: (event) => {
      const adId = event.adInstance?.getAdId?.() ?? "unknown";
      logger.debug(`onAdImpression: adId=${adId}`)();
    },
    onAdImpressionEnd: (event) => {
      const adId = event.adInstance?.getAdId?.() ?? "unknown";
      logger.debug(`onAdImpressionEnd: adId=${adId}`)();
    },
    onAdClick: (event) => {
      const url = event.url ?? "unknown";
      pipe(
        logger.info(`onAdClick: url=${url}`),
        IO.flatMap(() => events.onAdClick(url)),
      )();
    },
    onAdError: (event) => {
      logger.error(`onAdError: code=${event.errorCode ?? "?"}, info=${event.errorInfo ?? "?"}`)();
    },
  };
};

export const registerListeners =
  (
    adContext: FreeWheel.AdContext,
    SDK: FreeWheel.SDK,
    core: CoreHandlers,
    notification: NotificationHandlers,
  ): IO.IO<void> =>
  () => {
    // Core: drive the ad delivery flow
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
    // Notification: log and notify the application
    adContext.addEventListener(SDK.EVENT_AD_IMPRESSION, notification.onAdImpression);
    adContext.addEventListener(SDK.EVENT_AD_IMPRESSION_END, notification.onAdImpressionEnd);
    adContext.addEventListener(SDK.EVENT_AD_CLICK, notification.onAdClick);
    adContext.addEventListener(SDK.EVENT_ERROR, notification.onAdError);
  };

export const removeListeners =
  (
    adContext: FreeWheel.AdContext,
    SDK: FreeWheel.SDK,
    core: CoreHandlers,
    notification: NotificationHandlers,
  ): IO.IO<void> =>
  () => {
    // Core
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
    // Notification
    adContext.removeEventListener(SDK.EVENT_AD_IMPRESSION, notification.onAdImpression);
    adContext.removeEventListener(SDK.EVENT_AD_IMPRESSION_END, notification.onAdImpressionEnd);
    adContext.removeEventListener(SDK.EVENT_AD_CLICK, notification.onAdClick);
    adContext.removeEventListener(SDK.EVENT_ERROR, notification.onAdError);
  };
