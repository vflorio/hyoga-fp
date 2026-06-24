import { constVoid, pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { match, P } from "ts-pattern";
import type { FwAdSlot } from "../..";
import type { ContextRunnerOpContext } from "..";
import * as Transitions from "../transitions";
import type { PlaybackOps } from "./playback";

export interface AdBreakOps {
  readonly playPreroll: IO.IO<void>;
  readonly playPostroll: IO.IO<void>;
  readonly onSlotStarted: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

export const createAdBreakOps = (context: ContextRunnerOpContext, playback: PlaybackOps): AdBreakOps => {
  const { getState, setState, adContext, SDK, logger /* emit */ } = context;

  const playPreroll: IO.IO<void> = pipe(
    getState,
    IO.flatMap((state) =>
      pipe(
        RA.head(state.prerolls),
        O.match(
          () =>
            pipe(
              logger.debug("[AdBreakOps] playPreroll: no prerolls remaining, starting content"),
              IO.flatMap(() => playback.playContent(state.contentSrc, 0)),
            ),
          (slot) =>
            pipe(
              logger.info(`[AdBreakOps] playPreroll: playing slot (${state.prerolls.length} remaining)`),
              IO.flatMap(() => setState(Transitions.popPreroll(slot))),
              IO.flatMap(() => () => slot.play()),
            ),
        ),
      ),
    ),
  );

  const playPostroll: IO.IO<void> = pipe(
    getState,
    IO.flatMap((state) =>
      pipe(
        RA.head(state.postrolls),
        O.match(
          () => pipe(logger.debug("[AdBreakOps] playPostroll: no postrolls remaining"), IO.asUnit),
          (slot) =>
            pipe(
              logger.info(`[AdBreakOps] playPostroll: playing slot (${state.postrolls.length} remaining)`),
              IO.flatMap(() => setState(Transitions.popPostroll(slot))),
              IO.flatMap(() => () => slot.play()),
            ),
        ),
      ),
    ),
  );

  const onSlotStarted = (event: { slot: FwAdSlot.AdSlot }): void => {
    const classId = event.slot.getTimePositionClass();
    pipe(
      logger.info(`[AdBreakOps] onSlotStarted: classId=${classId}, adCount=${event.slot.getAdCount()}`),
      IO.flatMap(() =>
        pipe(
          match(classId)
            .with(
              P.union(
                SDK.TIME_POSITION_CLASS_PREROLL,
                SDK.TIME_POSITION_CLASS_MIDROLL,
                SDK.TIME_POSITION_CLASS_POSTROLL,
                SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
              ),
              () => () => {
                //emit({ _tag: "AdBreakStarted" });
              },
            )
            .otherwise(() => constVoid),
        ),
      ),
    )();
  };

  const restoreAfterMidroll: IO.IO<void> = pipe(
    getState,
    IO.flatMap((state) =>
      match(state.phase)
        .with({ _tag: "Midroll" }, () =>
          pipe(
            logger.info(`[AdBreakOps] restoreAfterMidroll: resuming content at ${state.contentPausedOn}s`),
            IO.flatMap(() => playback.playContent(state.contentSrc, state.contentPausedOn)),
          ),
        )
        .otherwise(() =>
          pipe(
            logger.warn(`[AdBreakOps] restoreAfterMidroll: unexpected phase=${state.phase._tag}, skipping`),
            IO.flatMap(() => constVoid),
          ),
        ),
    ),
  );

  const restoreAfterPauseMidroll: IO.IO<void> = pipe(
    getState,
    IO.flatMap((state) => {
      const resumeAt = state.contentPausedOn;
      const wasUserResumed = state.phase._tag === "Content";

      return pipe(
        logger.info(
          `[AdBreakOps] restoreAfterPauseMidroll: phase=${state.phase._tag}, resumeAt=${resumeAt}, wasUserResumed=${wasUserResumed}`,
        ),
        IO.flatMap(() =>
          match(state.phase)
            .with({ _tag: "Content" }, () => constVoid)
            .otherwise(() => setState(Transitions.setPhase({ _tag: "Content" }))),
        ),
        IO.flatMap(() => context.videoAdapter.seek(state.contentSrc, resumeAt)),
        IO.flatMap(() => playback.addVideoListeners),
        IO.flatMap(() =>
          match(wasUserResumed)
            .with(true, () =>
              pipe(
                logger.debug("[AdBreakOps] restoreAfterPauseMidroll: user already resumed, playing"),
                IO.flatMap(() => context.videoAdapter.play),
              ),
            )
            .otherwise(() =>
              pipe(
                logger.debug("[AdBreakOps] restoreAfterPauseMidroll: user hasn't resumed, staying paused"),
                IO.flatMap(() => constVoid),
              ),
            ),
        ),
      );
    }),
  );

  const onSlotEnded = (event: { slot: FwAdSlot.AdSlot }): void => {
    pipe(
      IO.of(event.slot.getTimePositionClass()),
      IO.tap((classId) =>
        logger.info(`[AdBreakOps] onSlotEnded: classId=${classId}, adCount=${event.slot.getAdCount()}`),
      ),
      IO.flatMap(
        (classId): IO.IO<void> =>
          match(classId)
            .with(SDK.TIME_POSITION_CLASS_PREROLL, () =>
              pipe(
                logger.debug("[AdBreakOps] onSlotEnded: decision -> playPreroll"),
                IO.flatMap(() => playPreroll),
              ),
            )
            .with(SDK.TIME_POSITION_CLASS_POSTROLL, () =>
              pipe(
                logger.debug("[AdBreakOps] onSlotEnded: decision -> playPostroll"),
                IO.flatMap(() => playPostroll),
              ),
            )
            .with(SDK.TIME_POSITION_CLASS_MIDROLL, () =>
              pipe(
                logger.debug("[AdBreakOps] onSlotEnded: decision -> restoreAfterMidroll"),
                IO.flatMap(() => restoreAfterMidroll),
              ),
            )
            .with(SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL, () =>
              pipe(
                logger.debug("[AdBreakOps] onSlotEnded: decision -> restoreAfterPauseMidroll"),
                IO.flatMap(() => restoreAfterPauseMidroll),
              ),
            )
            .with(SDK.TIME_POSITION_CLASS_OVERLAY, () =>
              pipe(
                logger.debug("[AdBreakOps] onSlotEnded: overlay ended, no action needed"),
                IO.flatMap(() => constVoid),
              ),
            )
            .otherwise(() =>
              pipe(
                logger.warn(`[AdBreakOps] onSlotEnded: unhandled classId=${classId}, ignoring`),
                IO.flatMap(() => constVoid),
              ),
            ),
      ),
    )();
  };

  const onContentPauseRequest = (): void =>
    pipe(
      logger.debug("[AdBreakOps] onContentPauseRequest: SDK requested content pause"),
      IO.flatMap(() => playback.removeVideoListeners),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PAUSED)),
    )();

  const onContentResumeRequest = (): void =>
    pipe(
      logger.debug("[AdBreakOps] onContentResumeRequest: SDK requested content resume"),
      IO.flatMap(() => playback.addVideoListeners),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PLAYING)),
    )();

  return {
    playPreroll,
    playPostroll,
    onSlotStarted,
    onSlotEnded,
    onContentPauseRequest,
    onContentResumeRequest,
  };
};
