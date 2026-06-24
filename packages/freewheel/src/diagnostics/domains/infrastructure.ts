import { type DiagnosticsDomainHandler, dispatchSdkEvent, extractAdId } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withInfrastructure = (deps: DiagnosticDeps): DiagnosticsDomainHandler => {
  const { adContext, SDK } = deps;

  const adapter = {
    onRequestInitiated: dispatchSdkEvent(deps, "REQUEST_INITIATED", () => ({
      _tag: "RequestInitiated",
    })),
    onResellerNoAd: dispatchSdkEvent(deps, "RESELLER_NO_AD", (rawEvent) => ({
      _tag: "ResellerNoAd",
      adId: extractAdId(rawEvent),
    })),
    onExtensionLoaded: dispatchSdkEvent(deps, "EXTENSION_LOADED", (rawEvent) => ({
      _tag: "ExtensionLoaded",
      moduleType: typeof (rawEvent as any)?.moduleType === "string" ? (rawEvent as any).moduleType : "unknown",
      customId: typeof (rawEvent as any)?.customId === "string" ? (rawEvent as any).customId : "unknown",
    })),
    onVideoDisplayBaseChanged: dispatchSdkEvent(deps, "VIDEO_DISPLAY_BASE_CHANGED", () => ({
      _tag: "VideoDisplayBaseChanged",
    })),
    onAdError: dispatchSdkEvent(deps, "ERROR", (rawEvent) => ({
      _tag: "AdError",
      errorCode: (rawEvent as any)?.errorCode ?? "unknown",
      errorInfo: (rawEvent as any)?.errorInfo ?? "unknown",
      errorModule: (rawEvent as any)?.errorModule ?? "unknown",
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
