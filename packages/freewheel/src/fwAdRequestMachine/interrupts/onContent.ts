import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import type { FwAdRequestMachineDeps } from "..";

export type ContentEvents =
  // VideoElement attached Handlers
  | { readonly _tag: "Event/Content/Ended" }
  | { readonly _tag: "Event/Content/TimeUpdate"; time: number }
  // FreeWheelSDK attached Handlers
  | { readonly _tag: "Event/Content/PauseRequest" }
  | { readonly _tag: "Event/Content/ResumeRequest" };

export const onContentPauseRequest = (deps: FwAdRequestMachineDeps) =>
  pipe(
    deps.logger.info("[Interrupts] onContentPauseRequest"),
    IO.flatMap(() => deps.emitIO({ _tag: "Event/Content/PauseRequest" })),
  );

export const onContentResumeRequest = (deps: FwAdRequestMachineDeps) =>
  pipe(
    deps.logger.info("[Interrupts] onContentResumeRequest"),
    IO.flatMap(() => deps.emitIO({ _tag: "Event/Content/ResumeRequest" })),
  );

export const onContentEnded = (deps: FwAdRequestMachineDeps): IO.IO<void> =>
  pipe(
    deps.logger.info("[Interrupts] onContentEnded"),
    IO.flatMap(() => deps.emitIO({ _tag: "Event/Content/Ended" })),
  );

export const onContentTimeUpdate = (deps: FwAdRequestMachineDeps): IO.IO<void> =>
  pipe(
    deps.logger.info("[Interrupts] onContentTimeUpdate"),
    IO.flatMap(() => deps.emitIO({ _tag: "Event/Content/TimeUpdate", time: deps.getVideoAdapter().getCurrentTime() })),
  );
