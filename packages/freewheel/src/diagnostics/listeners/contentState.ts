import { type DiagnosticsDomainHandler, dispatchSdkEvent } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withContentState = (deps: DiagnosticDeps): DiagnosticsDomainHandler => {
  const { adContext, SDK } = deps;

  const adapter = {
    onContentVideoPaused: dispatchSdkEvent(deps, "CONTENT_VIDEO_PAUSED", () => ({
      _tag: "ContentVideoPaused",
    })),
    onContentVideoResumed: dispatchSdkEvent(deps, "CONTENT_VIDEO_RESUMED", () => ({
      _tag: "ContentVideoResumed",
    })),
  };

  const bindings: [string, (rawEvent: any) => void][] = [
    [SDK.EVENT_CONTENT_VIDEO_PAUSED, adapter.onContentVideoPaused],
    [SDK.EVENT_CONTENT_VIDEO_RESUMED, adapter.onContentVideoResumed],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
