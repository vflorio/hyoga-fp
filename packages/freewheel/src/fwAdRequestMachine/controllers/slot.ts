import type { Logger } from "@hyoga-fp/core";
import * as IO from "fp-ts/IO";
import { constVoid, pipe } from "fp-ts/lib/function";
import { match, P } from "ts-pattern";
import type { FwAdSlot } from "../..";
import type { FwAdRequestMachineDeps } from "..";

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

export interface SlotEndedEffects {
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
  (deps: FwAdRequestMachineDeps) => (effects: SlotEndedEffects) => (event: { slot: FwAdSlot.AdSlot }) =>
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
                IO.flatMap(() => effects.onPreroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_POSTROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_POSTROLL),
                IO.flatMap(() => effects.onPostroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_MIDROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_MIDROLL),
                IO.flatMap(() => effects.onMidroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL),
                IO.flatMap(() => effects.onPauseMidroll),
              ),
            )
            .with(deps.SDK.TIME_POSITION_CLASS_OVERLAY, () =>
              pipe(
                logClassIdDecision(deps.logger, deps.SDK.TIME_POSITION_CLASS_OVERLAY),
                IO.flatMap(() => effects.onOverlay),
              ),
            )
            .otherwise(() => deps.logger.warn(`[onSlotEnded] unknown decision -> ${classId}`)),
      ),
    );
