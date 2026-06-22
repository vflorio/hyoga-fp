import { type CategoryPair, dispatch } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withContentState = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const adapter = {
    onContentVideoPaused: dispatch(deps, "CONTENT_VIDEO_PAUSED", () => ({
      _tag: "ContentVideoPaused",
    })),
    onContentVideoResumed: dispatch(deps, "CONTENT_VIDEO_RESUMED", () => ({
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
