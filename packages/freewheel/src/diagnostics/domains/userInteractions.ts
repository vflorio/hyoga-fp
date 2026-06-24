import { type DiagnosticsDomainHandler, dispatchSdkEvent, extractAdId } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withUserInteractions = (deps: DiagnosticDeps): DiagnosticsDomainHandler => {
  const { adContext, SDK } = deps;

  const adapter = {
    onAdClick: dispatchSdkEvent(deps, "AD_CLICK", (rawEvent) => {
      const extractUrlType = (event: unknown): [string, string] => [
        (event as any)?.url ?? (event as any)?.url ?? "unknown",
        (event as any)?.type ?? (event as any)?.type ?? "unknown",
      ];
      const [url, type] = extractUrlType(rawEvent);
      return url || type.includes("defaultClick")
        ? {
            _tag: "AdClick",
            adId: extractAdId(rawEvent),
            url: url.length > 0 ? url : "unknown", // Alcuni eventi di click non hanno URL, in questo caso logghiamo "unknown" invece di una stringa vuota
          }
        : null;
    }),
    onAdMute: dispatchSdkEvent(deps, "AD_MUTE", (rawEvent) => ({
      _tag: "AdMute",
      adId: extractAdId(rawEvent),
    })),
    onAdUnmute: dispatchSdkEvent(deps, "AD_UNMUTE", (rawEvent) => ({
      _tag: "AdUnmute",
      adId: extractAdId(rawEvent),
    })),
    onAdPause: dispatchSdkEvent(deps, "AD_PAUSE", (rawEvent) => ({
      _tag: "AdPause",
      adId: extractAdId(rawEvent),
    })),
    onAdResume: dispatchSdkEvent(deps, "AD_RESUME", (rawEvent) => ({
      _tag: "AdResume",
      adId: extractAdId(rawEvent),
    })),
    onAdRewind: dispatchSdkEvent(deps, "AD_REWIND", (rawEvent) => ({
      _tag: "AdRewind",
      adId: extractAdId(rawEvent),
    })),
    onAdCollapse: dispatchSdkEvent(deps, "AD_COLLAPSE", (rawEvent) => ({
      _tag: "AdCollapse",
      adId: extractAdId(rawEvent),
    })),
    onAdExpand: dispatchSdkEvent(deps, "AD_EXPAND", (rawEvent) => ({
      _tag: "AdExpand",
      adId: extractAdId(rawEvent),
    })),
    onAdAcceptInvitation: dispatchSdkEvent(deps, "AD_ACCEPT_INVITATION", (rawEvent) => ({
      _tag: "AdAcceptInvitation",
      adId: extractAdId(rawEvent),
    })),
    onAdClose: dispatchSdkEvent(deps, "AD_CLOSE", (rawEvent) => ({
      _tag: "AdClose",
      adId: extractAdId(rawEvent),
    })),
    onAdMinimize: dispatchSdkEvent(deps, "AD_MINIMIZE", (rawEvent) => ({
      _tag: "AdMinimize",
      adId: extractAdId(rawEvent),
    })),
    onAdVolumeChange: dispatchSdkEvent(deps, "AD_VOLUME_CHANGE", (rawEvent) => {
      const extractVolume = (event: unknown): number => (event as any)?.volume ?? (event as any)?.volume ?? NaN;
      const volume = extractVolume(rawEvent);
      return Number.isFinite(volume)
        ? {
            _tag: "AdVolumeChange",
            adId: extractAdId(rawEvent),
            volume,
          }
        : null;
    }),
    onAdSkippableStateChanged: dispatchSdkEvent(deps, "AD_SKIPPABLE_STATE_CHANGED", (rawEvent) => {
      const extractSkippable = (event: unknown): boolean | null =>
        typeof (event as any)?.skippableState === "boolean" ? (event as any).skippableState : null;
      const skippable = extractSkippable(rawEvent);
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
