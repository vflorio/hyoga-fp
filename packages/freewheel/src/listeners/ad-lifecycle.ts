import { type CategoryPair, type DiagnosticDeps, dispatch, extractAdId } from "./types";

export const withAdLifecycle = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const handlers = {
    onAdInitiated: dispatch(deps, "AD_INITIATED", (e) => ({ _tag: "AdInitiated", adId: extractAdId(e) })),
    onAdImpression: dispatch(deps, "AD_IMPRESSION", (e) => ({ _tag: "AdImpression", adId: extractAdId(e) })),
    onAdImpressionEnd: dispatch(deps, "AD_IMPRESSION_END", (e) => ({ _tag: "AdImpressionEnd", adId: extractAdId(e) })),
    onAdFirstQuartile: dispatch(deps, "AD_FIRST_QUARTILE", (e) => ({ _tag: "AdFirstQuartile", adId: extractAdId(e) })),
    onAdMidpoint: dispatch(deps, "AD_MIDPOINT", (e) => ({ _tag: "AdMidpoint", adId: extractAdId(e) })),
    onAdThirdQuartile: dispatch(deps, "AD_THIRD_QUARTILE", (e) => ({ _tag: "AdThirdQuartile", adId: extractAdId(e) })),
    onAdComplete: dispatch(deps, "AD_COMPLETE", (e) => ({ _tag: "AdComplete", adId: extractAdId(e) })),
    onAdSkipped: dispatch(deps, "AD_SKIPPED", (e) => ({ _tag: "AdSkipped", adId: extractAdId(e) })),
    onAdProgress: dispatch(deps, "AD_PROGRESS", (e) => {
      const time = typeof e?.playheadTime === "number" ? e.playheadTime : NaN;
      return Number.isFinite(time) ? { _tag: "AdProgress", adId: extractAdId(e), time } : null;
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_AD_INITIATED, handlers.onAdInitiated],
    [SDK.EVENT_AD_IMPRESSION, handlers.onAdImpression],
    [SDK.EVENT_AD_IMPRESSION_END, handlers.onAdImpressionEnd],
    [SDK.EVENT_AD_FIRST_QUARTILE, handlers.onAdFirstQuartile],
    [SDK.EVENT_AD_MIDPOINT, handlers.onAdMidpoint],
    [SDK.EVENT_AD_THIRD_QUARTILE, handlers.onAdThirdQuartile],
    [SDK.EVENT_AD_COMPLETE, handlers.onAdComplete],
    [SDK.EVENT_AD_SKIPPED, handlers.onAdSkipped],
    [SDK.EVENT_AD_PROGRESS, handlers.onAdProgress],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
