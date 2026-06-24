import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import type { FwAdRequestMachineDeps, FwAdRequestMachineInstance } from "..";
import { type ContentCurrentTimeDeps, onContentCurrentTime } from "./contentCurrentTime";

const fromInstance =
  (deps: FwAdRequestMachineDeps) =>
  (instance: FwAdRequestMachineInstance): ContentCurrentTimeDeps => ({
    ...deps,
    setState: instance.stateful.setState,
    getState: instance.stateful.getState,
    prepareVideoToShowAdSlot: removeVideoListeners(deps)(instance),
  });

const time = (deps: FwAdRequestMachineDeps) => deps.getVideoAdapter().getCurrentTime();

const addVideoListeners =
  (deps: FwAdRequestMachineDeps) =>
  (instance: FwAdRequestMachineInstance): IO.IO<void> =>
    pipe(
      IO.Do,
      IO.flatMap(() =>
        deps.getVideoAdapter().on("timeupdate", onContentCurrentTime(fromInstance(deps)(instance))(time(deps))),
      ),
      //IO.flatMap(() => deps.getVideoAdapter().on("ended", onContentEnded)),
    );

const removeVideoListeners =
  (deps: FwAdRequestMachineDeps) =>
  (instance: FwAdRequestMachineInstance): IO.IO<void> =>
    pipe(
      IO.Do,
      IO.flatMap(() =>
        deps.getVideoAdapter().off("timeupdate", onContentCurrentTime(fromInstance(deps)(instance))(time(deps))),
      ),
      //IO.flatMap(() => deps.getVideoAdapter().off("ended", onContentEnded)),
    );

export const onContentPauseRequest = (deps: FwAdRequestMachineDeps) => (instance: FwAdRequestMachineInstance) =>
  pipe(
    deps.logger.debug("[onContentPauseRequest] SDK requested content pause"),
    IO.flatMap(() => removeVideoListeners(deps)(instance)),
    IO.flatMap(() => () => deps.adContext.setVideoState(deps.SDK.VIDEO_STATE_PAUSED)),
    IO.flatMap(() => () => deps.emit({ _tag: "ContentPauseRequest" })),
  );

export const onContentResumeRequest = (deps: FwAdRequestMachineDeps) => (instance: FwAdRequestMachineInstance) =>
  pipe(
    deps.logger.debug("[onContentResumeRequest] SDK requested content resume"),
    IO.flatMap(() => addVideoListeners(deps)(instance)),
    IO.flatMap(() => () => deps.adContext.setVideoState(deps.SDK.VIDEO_STATE_PLAYING)),
    IO.flatMap(() => () => deps.emit({ _tag: "ContentResumeRequest" })),
  );
