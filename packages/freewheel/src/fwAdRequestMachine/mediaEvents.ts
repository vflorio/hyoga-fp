import type { Logger } from "@hyoga-fp/core";
import * as IO from "fp-ts/IO";
import { constVoid, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { match, P } from "ts-pattern";
import type { FwAdContext, FwAdSlot, FwSdk } from "..";
import type { FwAdRequestMachineDeps } from ".";

export interface MediaEventListeners {
  readonly onSlotStarted: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

// Media Events
export const SlotStarted = t.type({ _tag: t.literal("SlotStarted") });
export const SlotEnded = t.type({ _tag: t.literal("SlotEnded") });
export const ContentPauseRequest = t.type({ _tag: t.literal("ContentPauseRequest") });
export const ContentResumeRequest = t.type({ _tag: t.literal("ContentResumeRequest") });

export const MediaEvent = t.union([SlotStarted, SlotEnded, ContentPauseRequest, ContentResumeRequest]);
export type MediaEvent = t.TypeOf<typeof MediaEvent>;

// Media Event Listeners

export const registerMediaEventListeners =
  (adContext: FwAdContext.AdContext, SDK: FwSdk.SDK, handle: MediaEventListeners): IO.IO<void> =>
  () => {
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, handle.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, handle.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, handle.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, handle.onSlotEnded);
  };

export const removeMediaEventListeners =
  (adContext: FwAdContext.AdContext, SDK: FwSdk.SDK, handle: MediaEventListeners): IO.IO<void> =>
  () => {
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, handle.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, handle.onSlotEnded);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, handle.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, handle.onContentResumeRequest);
  };

// Slot Started

export const onSlotStarted = (deps: FwAdRequestMachineDeps) => (event: { slot: FwAdSlot.AdSlot }) =>
  pipe(
    IO.of(event.slot.getTimePositionClass()),
    IO.tap((classId) => deps.logger.info(`[onSlotStarted] classId=${classId}, adCount=${event.slot.getAdCount()}`)),
    IO.flatMap((classId) =>
      pipe(
        match(classId)
          .with(
            P.union(
              deps.SDK.TIME_POSITION_CLASS_PREROLL,
              deps.SDK.TIME_POSITION_CLASS_MIDROLL,
              deps.SDK.TIME_POSITION_CLASS_POSTROLL,
              deps.SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
            ),
            () => () => deps.emit({ _tag: "SlotStarted" }),
          )
          .otherwise(() => constVoid),
      ),
    ),
  );

// Slot Ended

interface SlotEndedDecisions {
  onPreroll: IO.IO<void>;
  onPostroll: IO.IO<void>;
  onMidroll: IO.IO<void>;
  onPauseMidroll: IO.IO<void>;
  onOverlay: IO.IO<void>;
}

const logClassIdDecision = (logger: Logger, classId: string) => logger.debug(`[onSlotEnded] decision -> ${classId}`);

const emitSlotEnded =
  (deps: FwAdRequestMachineDeps) =>
  (classId: string): IO.IO<void> =>
    match(classId)
      .with(
        P.union(
          deps.SDK.TIME_POSITION_CLASS_PREROLL,
          deps.SDK.TIME_POSITION_CLASS_MIDROLL,
          deps.SDK.TIME_POSITION_CLASS_POSTROLL,
          deps.SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
          deps.SDK.TIME_POSITION_CLASS_OVERLAY,
        ),
        () => () => deps.emit({ _tag: "SlotEnded" }),
      )
      .otherwise(() => constVoid);

export const onSlotEnded =
  (deps: FwAdRequestMachineDeps) => (decisions: SlotEndedDecisions) => (event: { slot: FwAdSlot.AdSlot }) =>
    pipe(
      IO.of(event.slot.getTimePositionClass()),
      IO.tap((classId) => deps.logger.info(`[onSlotEnded] classId=${classId}, adCount=${event.slot.getAdCount()}`)),
      IO.tap(emitSlotEnded(deps)),
      IO.flatMap(
        (classId): IO.IO<void> =>
          match(classId)
            .with(deps.SDK.TIME_POSITION_CLASS_PREROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_PREROLL),
                IO.flatMap(() => decisions.onPreroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_POSTROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_POSTROLL),
                IO.flatMap(() => decisions.onPostroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_MIDROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_MIDROLL),
                IO.flatMap(() => decisions.onMidroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL),
                IO.flatMap(() => decisions.onPauseMidroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_OVERLAY, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_OVERLAY),
                IO.flatMap(() => decisions.onOverlay),
              ),
            )
            .otherwise(() => deps.logger.warn(`[onSlotEnded] unknown decision -> ${classId}`)),
      ),
    );

const addVideoListeners = (deps: FwAdRequestMachineDeps) =>
  pipe(
    IO.Do,
    //IO.flatMap(() => deps.getVideoAdapter().on("timeupdate", onContentTimeUpdate)),
    //IO.flatMap(() => deps.getVideoAdapter().on("ended", onContentEnded)),
  );

const removeVideoListeners = (deps: FwAdRequestMachineDeps) =>
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
