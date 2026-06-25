import * as t from "io-ts";

// FreeWheel Events Schema Codecs

// Ad lifecycle
export const AdInitiated = t.type({ _tag: t.literal("FreeWheel/AdInitiated"), adId: t.string });
export const AdImpression = t.type({ _tag: t.literal("FreeWheel/AdImpression"), adId: t.string });
export const AdImpressionEnd = t.type({ _tag: t.literal("FreeWheel/AdImpressionEnd"), adId: t.string });
export const AdFirstQuartile = t.type({ _tag: t.literal("FreeWheel/AdFirstQuartile"), adId: t.string });
export const AdMidpoint = t.type({ _tag: t.literal("FreeWheel/AdMidpoint"), adId: t.string });
export const AdThirdQuartile = t.type({ _tag: t.literal("FreeWheel/AdThirdQuartile"), adId: t.string });
export const AdComplete = t.type({ _tag: t.literal("FreeWheel/AdComplete"), adId: t.string });
export const AdSkipped = t.type({ _tag: t.literal("FreeWheel/AdSkipped"), adId: t.string });
export const AdProgress = t.type({ _tag: t.literal("FreeWheel/AdProgress"), adId: t.string, time: t.number });

// User interactions
export const AdClick = t.type({ _tag: t.literal("FreeWheel/AdClick"), url: t.string });
export const AdMute = t.type({ _tag: t.literal("FreeWheel/AdMute"), adId: t.string });
export const AdUnmute = t.type({ _tag: t.literal("FreeWheel/AdUnmute"), adId: t.string });
export const AdPause = t.type({ _tag: t.literal("FreeWheel/AdPause"), adId: t.string });
export const AdResume = t.type({ _tag: t.literal("FreeWheel/AdResume"), adId: t.string });
export const AdRewind = t.type({ _tag: t.literal("FreeWheel/AdRewind"), adId: t.string });
export const AdCollapse = t.type({ _tag: t.literal("FreeWheel/AdCollapse"), adId: t.string });
export const AdExpand = t.type({ _tag: t.literal("FreeWheel/AdExpand"), adId: t.string });
export const AdAcceptInvitation = t.type({ _tag: t.literal("FreeWheel/AdAcceptInvitation"), adId: t.string });
export const AdClose = t.type({ _tag: t.literal("FreeWheel/AdClose"), adId: t.string });
export const AdMinimize = t.type({ _tag: t.literal("FreeWheel/AdMinimize"), adId: t.string });
export const AdVolumeChange = t.type({ _tag: t.literal("FreeWheel/AdVolumeChange"), adId: t.string, volume: t.number });
export const AdSkippableStateChanged = t.type({
  _tag: t.literal("FreeWheel/AdSkippableStateChanged"),
  adId: t.string,
  skippable: t.boolean,
});

// Playback health
export const AdAutoPlayBlocked = t.type({ _tag: t.literal("FreeWheel/AdAutoPlayBlocked"), adId: t.string });
export const AdBufferingStart = t.type({ _tag: t.literal("FreeWheel/AdBufferingStart"), adId: t.string });
export const AdBufferingEnd = t.type({ _tag: t.literal("FreeWheel/AdBufferingEnd"), adId: t.string });
export const AdMeasurement = t.type({ _tag: t.literal("FreeWheel/AdMeasurement"), adId: t.string, eventId: t.string });

// Slot lifecycle
export const SlotImpression = t.type({
  _tag: t.literal("FreeWheel/SlotImpression"),
  customId: t.string,
  timePositionClass: t.string,
  adCount: t.number,
});
export const SlotEnd = t.type({
  _tag: t.literal("FreeWheel/SlotEnd"),
  customId: t.string,
  timePositionClass: t.string,
  adCount: t.number,
});

// Content video state (SDK-reported)
export const ContentVideoPaused = t.type({ _tag: t.literal("FreeWheel/ContentVideoPaused") });
export const ContentVideoResumed = t.type({ _tag: t.literal("FreeWheel/ContentVideoResumed") });

// Request and infrastructure
export const RequestInitiated = t.type({ _tag: t.literal("FreeWheel/RequestInitiated") });
export const ResellerNoAd = t.type({ _tag: t.literal("FreeWheel/ResellerNoAd"), adId: t.string });
export const ExtensionLoaded = t.type({
  _tag: t.literal("FreeWheel/ExtensionLoaded"),
  moduleType: t.string,
  customId: t.string,
});
export const VideoDisplayBaseChanged = t.type({ _tag: t.literal("FreeWheel/VideoDisplayBaseChanged") });

// Error
export const AdError = t.type({
  _tag: t.literal("FreeWheel/AdError"),
  errorCode: t.string,
  errorInfo: t.string,
  errorModule: t.string,
});

// Validation error: emitted when SDK payload doesn't match expected shape
export const ValidationError = t.type({
  _tag: t.literal("FreeWheel/ValidationError"),
  eventName: t.string,
  rawPayload: t.unknown,
  reason: t.string,
});

export const Event = t.union([
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

export type Event = t.TypeOf<typeof Event>;
