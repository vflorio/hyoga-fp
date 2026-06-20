import type * as IO from "fp-ts/IO";
import type * as FreeWheel from "../freewheel";

export interface CoreHandlers {
  readonly onSlotStarted: (event: { slot: FreeWheel.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FreeWheel.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

export const registerCoreHandlers =
  (adContext: FreeWheel.AdContext, SDK: FreeWheel.SDK, core: CoreHandlers): IO.IO<void> =>
  () => {
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
  };

export const removeCoreHandlers =
  (adContext: FreeWheel.AdContext, SDK: FreeWheel.SDK, core: CoreHandlers): IO.IO<void> =>
  () => {
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, core.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, core.onSlotEnded);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, core.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, core.onContentResumeRequest);
  };
