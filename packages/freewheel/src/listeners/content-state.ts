import { type CategoryPair, type DiagnosticDeps, dispatch } from "./types";

export const withContentState = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const handlers = {
    onContentVideoPaused: dispatch(deps, "CONTENT_VIDEO_PAUSED", () => ({ _tag: "ContentVideoPaused" })),
    onContentVideoResumed: dispatch(deps, "CONTENT_VIDEO_RESUMED", () => ({ _tag: "ContentVideoResumed" })),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_CONTENT_VIDEO_PAUSED, handlers.onContentVideoPaused],
    [SDK.EVENT_CONTENT_VIDEO_RESUMED, handlers.onContentVideoResumed],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
