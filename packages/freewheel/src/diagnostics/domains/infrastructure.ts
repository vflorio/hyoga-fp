import { type CategoryPair, dispatch, extractAdId } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withInfrastructure = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const adapter = {
    onRequestInitiated: dispatch(deps, "REQUEST_INITIATED", () => ({
      _tag: "RequestInitiated",
    })),
    onResellerNoAd: dispatch(deps, "RESELLER_NO_AD", (rawEvent) => ({
      _tag: "ResellerNoAd",
      adId: extractAdId(rawEvent),
    })),
    onExtensionLoaded: dispatch(deps, "EXTENSION_LOADED", (rawEvent) => ({
      _tag: "ExtensionLoaded",
      moduleType: typeof rawEvent?.moduleType === "string" ? rawEvent.moduleType : "unknown",
      customId: typeof rawEvent?.customId === "string" ? rawEvent.customId : "unknown",
    })),
    onVideoDisplayBaseChanged: dispatch(deps, "VIDEO_DISPLAY_BASE_CHANGED", () => ({
      _tag: "VideoDisplayBaseChanged",
    })),
    onAdError: dispatch(deps, "ERROR", (rawEvent) => ({
      _tag: "AdError",
      errorCode: rawEvent?.errorCode ?? "unknown",
      errorInfo: rawEvent?.errorInfo ?? "unknown",
      errorModule: rawEvent?.errorModule ?? "unknown",
    })),
  };

  const bindings: [string, (rawEvent: any) => void][] = [
    [SDK.EVENT_REQUEST_INITIATED, adapter.onRequestInitiated],
    [SDK.EVENT_RESELLER_NO_AD, adapter.onResellerNoAd],
    [SDK.EVENT_EXTENSION_LOADED, adapter.onExtensionLoaded],
    [SDK.EVENT_VIDEO_DISPLAY_BASE_CHANGED, adapter.onVideoDisplayBaseChanged],
    [SDK.EVENT_ERROR, adapter.onAdError],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
