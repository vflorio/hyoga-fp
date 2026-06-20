import { type CategoryPair, type DiagnosticDeps, dispatch, extractAdId } from "./types";

export const withInfrastructure = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const handlers = {
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
    [SDK.EVENT_REQUEST_INITIATED, handlers.onRequestInitiated],
    [SDK.EVENT_RESELLER_NO_AD, handlers.onResellerNoAd],
    [SDK.EVENT_EXTENSION_LOADED, handlers.onExtensionLoaded],
    [SDK.EVENT_VIDEO_DISPLAY_BASE_CHANGED, handlers.onVideoDisplayBaseChanged],
    [SDK.EVENT_ERROR, handlers.onAdError],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
