import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import type { FwAdRequestMachineDeps } from "..";

const addVideoListeners = (_deps: FwAdRequestMachineDeps) =>
  pipe(
    IO.Do,
    //IO.flatMap(() => deps.getVideoAdapter().on("timeupdate", onContentTimeUpdate)),
    //IO.flatMap(() => deps.getVideoAdapter().on("ended", onContentEnded)),
  );

const removeVideoListeners = (_deps: FwAdRequestMachineDeps) =>
  pipe(
    IO.Do,
    //IO.flatMap(() => deps.getVideoAdapter().off("timeupdate", onContentTimeUpdate)),
    //IO.flatMap(() => deps.getVideoAdapter().off("ended", onContentEnded)),
  );

export const onContentPauseRequest = (deps: FwAdRequestMachineDeps) =>
  pipe(
    deps.logger.debug("[onContentPauseRequest] SDK requested content pause"),
    IO.flatMap(() => removeVideoListeners(deps)),
    IO.flatMap(() => () => deps.adContext.setVideoState(deps.SDK.VIDEO_STATE_PAUSED)),
    IO.flatMap(() => () => deps.emit({ _tag: "ContentPauseRequest" })),
  );

export const onContentResumeRequest = (deps: FwAdRequestMachineDeps) =>
  pipe(
    deps.logger.debug("[onContentResumeRequest] SDK requested content resume"),
    IO.flatMap(() => addVideoListeners(deps)),
    IO.flatMap(() => () => deps.adContext.setVideoState(deps.SDK.VIDEO_STATE_PLAYING)),
    IO.flatMap(() => () => deps.emit({ _tag: "ContentResumeRequest" })),
  );
