import { type CategoryPair, type DiagnosticDeps, dispatch, extractAdId } from "./types";

export const withUserInteractions = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const handlers = {
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
    [SDK.EVENT_AD_CLICK, handlers.onAdClick],
    [SDK.EVENT_AD_MUTE, handlers.onAdMute],
    [SDK.EVENT_AD_UNMUTE, handlers.onAdUnmute],
    [SDK.EVENT_AD_PAUSE, handlers.onAdPause],
    [SDK.EVENT_AD_RESUME, handlers.onAdResume],
    [SDK.EVENT_AD_REWIND, handlers.onAdRewind],
    [SDK.EVENT_AD_COLLAPSE, handlers.onAdCollapse],
    [SDK.EVENT_AD_EXPAND, handlers.onAdExpand],
    [SDK.EVENT_AD_ACCEPT_INVITATION, handlers.onAdAcceptInvitation],
    [SDK.EVENT_AD_CLOSE, handlers.onAdClose],
    [SDK.EVENT_AD_MINIMIZE, handlers.onAdMinimize],
    [SDK.EVENT_AD_VOLUME_CHANGE, handlers.onAdVolumeChange],
    [SDK.EVENT_AD_SKIPPABLE_STATE_CHANGED, handlers.onAdSkippableStateChanged],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
