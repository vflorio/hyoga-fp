import { dispatch, extractAdId } from ".";
import type { CategoryPair, DiagnosticDeps } from "./types";

export const withPlaybackHealth = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const adapter = {
    onAdAutoPlayBlocked: dispatch(deps, "AD_AUTO_PLAY_BLOCKED", (rawEvent) => ({
      _tag: "AdAutoPlayBlocked",
      adId: extractAdId(rawEvent),
    })),
    onAdBufferingStart: dispatch(deps, "AD_BUFFERING_START", (rawEvent) => ({
      _tag: "AdBufferingStart",
      adId: extractAdId(rawEvent),
    })),
    onAdBufferingEnd: dispatch(deps, "AD_BUFFERING_END", (rawEvent) => ({
      _tag: "AdBufferingEnd",
      adId: extractAdId(rawEvent),
    })),
    onAdMeasurement: dispatch(deps, "AD_MEASUREMENT", (rawEvent) => ({
      _tag: "AdMeasurement",
      adId: extractAdId(rawEvent),
      eventId: typeof rawEvent?.concreteEventId === "string" ? rawEvent.concreteEventId : "unknown",
    })),
  };

  const bindings: [string, (rawEvent: any) => void][] = [
    [SDK.EVENT_AD_AUTO_PLAY_BLOCKED, adapter.onAdAutoPlayBlocked],
    [SDK.EVENT_AD_BUFFERING_START, adapter.onAdBufferingStart],
    [SDK.EVENT_AD_BUFFERING_END, adapter.onAdBufferingEnd],
    [SDK.EVENT_AD_MEASUREMENT, adapter.onAdMeasurement],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
