import { type CategoryPair, dispatch, extractAdId } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withUserInteractions = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const adapter = {
    onAdClick: dispatch(deps, "AD_CLICK", (rawEvent) => {
      const url = rawEvent?.url;
      return typeof url === "string"
        ? {
            _tag: "AdClick",
            url,
          }
        : null;
    }),
    onAdMute: dispatch(deps, "AD_MUTE", (rawEvent) => ({
      _tag: "AdMute",
      adId: extractAdId(rawEvent),
    })),
    onAdUnmute: dispatch(deps, "AD_UNMUTE", (rawEvent) => ({
      _tag: "AdUnmute",
      adId: extractAdId(rawEvent),
    })),
    onAdPause: dispatch(deps, "AD_PAUSE", (rawEvent) => ({
      _tag: "AdPause",
      adId: extractAdId(rawEvent),
    })),
    onAdResume: dispatch(deps, "AD_RESUME", (rawEvent) => ({
      _tag: "AdResume",
      adId: extractAdId(rawEvent),
    })),
    onAdRewind: dispatch(deps, "AD_REWIND", (rawEvent) => ({
      _tag: "AdRewind",
      adId: extractAdId(rawEvent),
    })),
    onAdCollapse: dispatch(deps, "AD_COLLAPSE", (rawEvent) => ({
      _tag: "AdCollapse",
      adId: extractAdId(rawEvent),
    })),
    onAdExpand: dispatch(deps, "AD_EXPAND", (rawEvent) => ({
      _tag: "AdExpand",
      adId: extractAdId(rawEvent),
    })),
    onAdAcceptInvitation: dispatch(deps, "AD_ACCEPT_INVITATION", (rawEvent) => ({
      _tag: "AdAcceptInvitation",
      adId: extractAdId(rawEvent),
    })),
    onAdClose: dispatch(deps, "AD_CLOSE", (rawEvent) => ({
      _tag: "AdClose",
      adId: extractAdId(rawEvent),
    })),
    onAdMinimize: dispatch(deps, "AD_MINIMIZE", (rawEvent) => ({
      _tag: "AdMinimize",
      adId: extractAdId(rawEvent),
    })),
    onAdVolumeChange: dispatch(deps, "AD_VOLUME_CHANGE", (rawEvent) => {
      const volume = typeof rawEvent?.volume === "number" ? rawEvent.volume : NaN;
      return Number.isFinite(volume)
        ? {
            _tag: "AdVolumeChange",
            adId: extractAdId(rawEvent),
            volume,
          }
        : null;
    }),
    onAdSkippableStateChanged: dispatch(deps, "AD_SKIPPABLE_STATE_CHANGED", (rawEvent) => {
      const skippable = typeof rawEvent?.skippableState === "boolean" ? rawEvent.skippableState : null;
      return skippable !== null
        ? {
            _tag: "AdSkippableStateChanged",
            adId: extractAdId(rawEvent),
            skippable,
          }
        : null;
    }),
  };

  const bindings: [string, (rawEvent: any) => void][] = [
    [SDK.EVENT_AD_CLICK, adapter.onAdClick],
    [SDK.EVENT_AD_MUTE, adapter.onAdMute],
    [SDK.EVENT_AD_UNMUTE, adapter.onAdUnmute],
    [SDK.EVENT_AD_PAUSE, adapter.onAdPause],
    [SDK.EVENT_AD_RESUME, adapter.onAdResume],
    [SDK.EVENT_AD_REWIND, adapter.onAdRewind],
    [SDK.EVENT_AD_COLLAPSE, adapter.onAdCollapse],
    [SDK.EVENT_AD_EXPAND, adapter.onAdExpand],
    [SDK.EVENT_AD_ACCEPT_INVITATION, adapter.onAdAcceptInvitation],
    [SDK.EVENT_AD_CLOSE, adapter.onAdClose],
    [SDK.EVENT_AD_MINIMIZE, adapter.onAdMinimize],
    [SDK.EVENT_AD_VOLUME_CHANGE, adapter.onAdVolumeChange],
    [SDK.EVENT_AD_SKIPPABLE_STATE_CHANGED, adapter.onAdSkippableStateChanged],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
