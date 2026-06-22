import * as t from "io-ts";

// FreeWheel Events Schema Codecs

// Player-level events
export const AdBreakStarted = t.type({ _tag: t.literal("AdBreakStarted") });
export const ContentResumed = t.type({ _tag: t.literal("ContentResumed") });
export const OverlayShown = t.type({ _tag: t.literal("OverlayShown") });
export const Complete = t.type({ _tag: t.literal("Complete") });

// Ad lifecycle
export const AdInitiated = t.type({ _tag: t.literal("AdInitiated"), adId: t.string });
export const AdImpression = t.type({ _tag: t.literal("AdImpression"), adId: t.string });
export const AdImpressionEnd = t.type({ _tag: t.literal("AdImpressionEnd"), adId: t.string });
export const AdFirstQuartile = t.type({ _tag: t.literal("AdFirstQuartile"), adId: t.string });
export const AdMidpoint = t.type({ _tag: t.literal("AdMidpoint"), adId: t.string });
export const AdThirdQuartile = t.type({ _tag: t.literal("AdThirdQuartile"), adId: t.string });
export const AdComplete = t.type({ _tag: t.literal("AdComplete"), adId: t.string });
export const AdSkipped = t.type({ _tag: t.literal("AdSkipped"), adId: t.string });
export const AdProgress = t.type({ _tag: t.literal("AdProgress"), adId: t.string, time: t.number });

// User interactions
export const AdClick = t.type({ _tag: t.literal("AdClick"), url: t.string });
export const AdMute = t.type({ _tag: t.literal("AdMute"), adId: t.string });
export const AdUnmute = t.type({ _tag: t.literal("AdUnmute"), adId: t.string });
export const AdPause = t.type({ _tag: t.literal("AdPause"), adId: t.string });
export const AdResume = t.type({ _tag: t.literal("AdResume"), adId: t.string });
export const AdRewind = t.type({ _tag: t.literal("AdRewind"), adId: t.string });
export const AdCollapse = t.type({ _tag: t.literal("AdCollapse"), adId: t.string });
export const AdExpand = t.type({ _tag: t.literal("AdExpand"), adId: t.string });
export const AdAcceptInvitation = t.type({ _tag: t.literal("AdAcceptInvitation"), adId: t.string });
export const AdClose = t.type({ _tag: t.literal("AdClose"), adId: t.string });
export const AdMinimize = t.type({ _tag: t.literal("AdMinimize"), adId: t.string });
export const AdVolumeChange = t.type({ _tag: t.literal("AdVolumeChange"), adId: t.string, volume: t.number });
export const AdSkippableStateChanged = t.type({
  _tag: t.literal("AdSkippableStateChanged"),
  adId: t.string,
  skippable: t.boolean,
});

// Playback health
export const AdAutoPlayBlocked = t.type({ _tag: t.literal("AdAutoPlayBlocked"), adId: t.string });
export const AdBufferingStart = t.type({ _tag: t.literal("AdBufferingStart"), adId: t.string });
export const AdBufferingEnd = t.type({ _tag: t.literal("AdBufferingEnd"), adId: t.string });
export const AdMeasurement = t.type({ _tag: t.literal("AdMeasurement"), adId: t.string, eventId: t.string });

// Slot lifecycle
export const SlotImpression = t.type({
  _tag: t.literal("SlotImpression"),
  customId: t.string,
  timePositionClass: t.string,
  adCount: t.number,
});
export const SlotEnd = t.type({
  _tag: t.literal("SlotEnd"),
  customId: t.string,
  timePositionClass: t.string,
  adCount: t.number,
});

// Content video state (SDK-reported)
export const ContentVideoPaused = t.type({ _tag: t.literal("ContentVideoPaused") });
export const ContentVideoResumed = t.type({ _tag: t.literal("ContentVideoResumed") });

// Request and infrastructure
export const RequestInitiated = t.type({ _tag: t.literal("RequestInitiated") });
export const ResellerNoAd = t.type({ _tag: t.literal("ResellerNoAd"), adId: t.string });
export const ExtensionLoaded = t.type({ _tag: t.literal("ExtensionLoaded"), moduleType: t.string, customId: t.string });
export const VideoDisplayBaseChanged = t.type({ _tag: t.literal("VideoDisplayBaseChanged") });

// Error
export const AdError = t.type({
  _tag: t.literal("AdError"),
  errorCode: t.string,
  errorInfo: t.string,
  errorModule: t.string,
});

// Validation error: emitted when SDK payload doesn't match expected shape
export const ValidationError = t.type({
  _tag: t.literal("ValidationError"),
  eventName: t.string,
  rawPayload: t.unknown,
  reason: t.string,
});

export const SDKEvent = t.union([
  // Player-level
  AdBreakStarted,
  ContentResumed,
  OverlayShown,
  Complete,
  // Ad lifecycle
  AdInitiated,
  AdImpression,
  AdImpressionEnd,
  AdFirstQuartile,
  AdMidpoint,
  AdThirdQuartile,
  AdComplete,
  AdSkipped,
  AdProgress,
  // User interactions
  AdClick,
  AdMute,
  AdUnmute,
  AdPause,
  AdResume,
  AdRewind,
  AdCollapse,
  AdExpand,
  AdAcceptInvitation,
  AdClose,
  AdMinimize,
  AdVolumeChange,
  AdSkippableStateChanged,
  // Playback health
  AdAutoPlayBlocked,
  AdBufferingStart,
  AdBufferingEnd,
  AdMeasurement,
  // Slot lifecycle
  SlotImpression,
  SlotEnd,
  // Content state
  ContentVideoPaused,
  ContentVideoResumed,
  // Infrastructure
  RequestInitiated,
  ResellerNoAd,
  ExtensionLoaded,
  VideoDisplayBaseChanged,
  // Error
  AdError,
  ValidationError,
]);

export type SDKEvent = t.TypeOf<typeof SDKEvent>;
