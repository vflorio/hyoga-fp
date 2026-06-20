import { type CategoryPair, type DiagnosticDeps, dispatch, extractAdId } from "./types";

export const withPlaybackHealth = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const handlers = {
    onAdAutoPlayBlocked: dispatch(deps, "AD_AUTO_PLAY_BLOCKED", (e) => ({
      _tag: "AdAutoPlayBlocked",
      adId: extractAdId(e),
    })),
    onAdBufferingStart: dispatch(deps, "AD_BUFFERING_START", (e) => ({
      _tag: "AdBufferingStart",
      adId: extractAdId(e),
    })),
    onAdBufferingEnd: dispatch(deps, "AD_BUFFERING_END", (e) => ({
      _tag: "AdBufferingEnd",
      adId: extractAdId(e),
    })),
    onAdMeasurement: dispatch(deps, "AD_MEASUREMENT", (e) => {
      const eventId = typeof e?.concreteEventId === "string" ? e.concreteEventId : "unknown";
      return { _tag: "AdMeasurement", adId: extractAdId(e), eventId };
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_AD_AUTO_PLAY_BLOCKED, handlers.onAdAutoPlayBlocked],
    [SDK.EVENT_AD_BUFFERING_START, handlers.onAdBufferingStart],
    [SDK.EVENT_AD_BUFFERING_END, handlers.onAdBufferingEnd],
    [SDK.EVENT_AD_MEASUREMENT, handlers.onAdMeasurement],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
