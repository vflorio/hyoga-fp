import { type DiagnosticsDomainHandler, dispatchSdkEvent, extractAdId } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withAdLifecycle = (deps: DiagnosticDeps): DiagnosticsDomainHandler => {
  const { adContext, SDK } = deps;

  const adapter = {
    onAdInitiated: dispatchSdkEvent(deps, "AD_INITIATED", (rawEvent) => ({
      _tag: "AdInitiated",
      adId: extractAdId(rawEvent),
    })),
    onAdImpression: dispatchSdkEvent(deps, "AD_IMPRESSION", (rawEvent) => ({
      _tag: "AdImpression",
      adId: extractAdId(rawEvent),
    })),
    onAdImpressionEnd: dispatchSdkEvent(deps, "AD_IMPRESSION_END", (rawEvent) => ({
      _tag: "AdImpressionEnd",
      adId: extractAdId(rawEvent),
    })),
    onAdFirstQuartile: dispatchSdkEvent(deps, "AD_FIRST_QUARTILE", (rawEvent) => ({
      _tag: "AdFirstQuartile",
      adId: extractAdId(rawEvent),
    })),
    onAdMidpoint: dispatchSdkEvent(deps, "AD_MIDPOINT", (rawEvent) => ({
      _tag: "AdMidpoint",
      adId: extractAdId(rawEvent),
    })),
    onAdThirdQuartile: dispatchSdkEvent(deps, "AD_THIRD_QUARTILE", (rawEvent) => ({
      _tag: "AdThirdQuartile",
      adId: extractAdId(rawEvent),
    })),
    onAdComplete: dispatchSdkEvent(deps, "AD_COMPLETE", (rawEvent) => ({
      _tag: "AdComplete",
      adId: extractAdId(rawEvent),
    })),
    onAdSkipped: dispatchSdkEvent(deps, "AD_SKIPPED", (rawEvent) => ({
      _tag: "AdSkipped",
      adId: extractAdId(rawEvent),
    })),
    onAdProgress: dispatchSdkEvent(deps, "AD_PROGRESS", (rawEvent) => {
      const time = typeof (rawEvent as any)?.playheadTime === "number" ? (rawEvent as any).playheadTime : NaN;
      return Number.isFinite(time)
        ? {
            _tag: "AdProgress",
            adId: extractAdId(rawEvent),
            time,
          }
        : null;
    }),
  };

  const bindings: [string, (rawEvent: any) => void][] = [
    [SDK.EVENT_AD_INITIATED, adapter.onAdInitiated],
    [SDK.EVENT_AD_IMPRESSION, adapter.onAdImpression],
    [SDK.EVENT_AD_IMPRESSION_END, adapter.onAdImpressionEnd],
    [SDK.EVENT_AD_FIRST_QUARTILE, adapter.onAdFirstQuartile],
    [SDK.EVENT_AD_MIDPOINT, adapter.onAdMidpoint],
    [SDK.EVENT_AD_THIRD_QUARTILE, adapter.onAdThirdQuartile],
    [SDK.EVENT_AD_COMPLETE, adapter.onAdComplete],
    [SDK.EVENT_AD_SKIPPED, adapter.onAdSkipped],
    [SDK.EVENT_AD_PROGRESS, adapter.onAdProgress],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
