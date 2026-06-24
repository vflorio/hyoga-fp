import type { Logger } from "@hyoga-fp/core";
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import type { FwAdContext, FwAdRequestPlayerAdapter, FwSdk } from "../..";
import type { EmitEventFn, FwAdRequestMachineDeps, FwAdRequestMachineInstance } from "..";
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
  (instance: FwAdRequestMachineInstance): IO.IO<IO.IO<void>> =>
    pipe(
      IO.Do,
      IO.bind("onContentCurrentTime", () => () => onContentCurrentTime(fromInstance(deps)(instance))(time(deps))),
      IO.bind("onContentEnded", () => () => onContentEnded(deps)),
      IO.tap(({ onContentCurrentTime }) => deps.getVideoAdapter().on("timeupdate", onContentCurrentTime)),
      IO.tap(({ onContentEnded }) => deps.getVideoAdapter().on("ended", onContentEnded)),
      IO.map((handlers) => removeVideoListeners(deps)(handlers)),
    );

const removeVideoListeners =
  (deps: FwAdRequestMachineDeps) =>
  (handlers: { onContentCurrentTime: IO.IO<void>; onContentEnded: IO.IO<void> }): IO.IO<void> =>
    pipe(
      IO.Do,
      IO.tap(() => deps.getVideoAdapter().off("timeupdate", handlers.onContentCurrentTime)),
      IO.tap(() => deps.getVideoAdapter().off("ended", handlers.onContentEnded)),
    );

// ContentEnded

export interface ContentEndedDeps {
  readonly SDK: FwSdk.SDK;
  readonly logger: Logger;
  readonly adContext: FwAdContext.AdContext;
  readonly emit: EmitEventFn;
  readonly getVideoAdapter: IO.IO<FwAdRequestPlayerAdapter.Adapter>;
}

const onContentEnded = (deps: ContentEndedDeps): IO.IO<void> =>
  pipe(
    deps.logger.info("[PlaybackOps] onContentEnded: content video ended, starting postroll chain"),
    IO.flatMap(() => deps.getVideoAdapter().off("ended", onContentEnded(deps))),
    IO.flatMap(() => () => deps.adContext.setVideoState(deps.SDK.VIDEO_STATE_COMPLETED)),
    //IO.flatMap(() => getPlayPostroll()),
  );

// Instance CoreHandlers

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
