import { type DiagnosticsDomainHandler, dispatchSdkEvent, extractAdId } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withPlaybackHealth = (deps: DiagnosticDeps): DiagnosticsDomainHandler => {
  const { adContext, SDK } = deps;

  const adapter = {
    onAdAutoPlayBlocked: dispatchSdkEvent(deps, "AD_AUTO_PLAY_BLOCKED", (rawEvent) => ({
      _tag: "FreeWheel/AdAutoPlayBlocked",
      adId: extractAdId(rawEvent),
    })),
    onAdBufferingStart: dispatchSdkEvent(deps, "AD_BUFFERING_START", (rawEvent) => ({
      _tag: "FreeWheel/AdBufferingStart",
      adId: extractAdId(rawEvent),
    })),
    onAdBufferingEnd: dispatchSdkEvent(deps, "AD_BUFFERING_END", (rawEvent) => ({
      _tag: "FreeWheel/AdBufferingEnd",
      adId: extractAdId(rawEvent),
    })),
    onAdMeasurement: dispatchSdkEvent(deps, "AD_MEASUREMENT", (rawEvent) => ({
      _tag: "FreeWheel/AdMeasurement",
      adId: extractAdId(rawEvent),
      eventId: typeof (rawEvent as any)?.concreteEventId === "string" ? (rawEvent as any).concreteEventId : "unknown",
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
