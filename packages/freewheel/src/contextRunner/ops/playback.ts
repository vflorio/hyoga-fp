import { constVoid, flow, pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { match, P } from "ts-pattern";
import type { ContextRunnerOpContext } from "..";
import * as Transitions from "../transitions";

export interface PlaybackOps {
  readonly addVideoListeners: IO.IO<void>;
  readonly removeVideoListeners: IO.IO<void>;
  readonly playContent: (src: string, startAt: number) => IO.IO<void>;
}

export const createPlaybackOps = (context: ContextRunnerOpContext, getPlayPostroll: () => IO.IO<void>): PlaybackOps => {
  const { stateRef, videoAdapter, adContext, SDK, logger, emit } = context;

  const onTimeUpdate = (): void => {
    pipe(
      stateRef.read,
      IO.flatMap((state) =>
        pipe(
          videoAdapter.getCurrentTime,
          IO.flatMap((time) => {
            const overlay = pipe(
              state.overlaySlots,
              RA.findFirst((slot) => Math.abs(slot.getTimePosition() - time) < 0.5),
            );

            const midroll = pipe(
              state.midrollSlots,
              RA.findFirst((slot) => Math.abs(slot.getTimePosition() - time) < 0.5),
            );

            return match({ overlay, midroll })
              .with({ overlay: P.when(O.isSome) }, ({ overlay }) =>
                pipe(
                  logger.info(
                    `onTimeUpdate: overlay triggered at t=${time.toFixed(2)}s (cue=${overlay.value.getTimePosition()}s)`,
                  ),
                  IO.flatMap(() => stateRef.modify(Transitions.dropOverlayNear(time))),
                  IO.flatMap(() => () => overlay.value.play()),
                  IO.flatMap(() => () => emit({ _tag: "OverlayShown" })),
                ),
              )
              .with({ midroll: P.when(O.isSome) }, ({ midroll }) =>
                pipe(
                  logger.info(
                    `onTimeUpdate: midroll triggered at t=${time.toFixed(2)}s (cue=${midroll.value.getTimePosition()}s), pausing content`,
                  ),
                  IO.flatMap(() => removeVideoListeners),
                  IO.flatMap(() => stateRef.modify(Transitions.popMidroll(midroll.value, time))),
                  IO.flatMap(() => midroll.value.play),
                ),
              )
              .when(
                () => state.overlaySlots.length === 0 && state.midrollSlots.length === 0,
                () =>
                  pipe(
                    logger.debug("onTimeUpdate: no timed slots remaining, removing timeupdate listener"),
                    IO.flatMap(() => removeVideoListeners),
                  ),
              )
              .otherwise(() => constVoid);
          }),
        ),
      ),
    )();
  };

  const onContentEnded = (): void =>
    pipe(
      logger.info("onContentEnded: content video ended, starting postroll chain"),
      IO.flatMap(() => videoAdapter.off("ended", onContentEnded)),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_COMPLETED)),
      IO.flatMap(() => getPlayPostroll()),
    )();

  const addVideoListeners: IO.IO<void> = pipe(
    IO.Do,
    IO.flatMap(() => videoAdapter.on("timeupdate", onTimeUpdate)),
    IO.flatMap(() => videoAdapter.on("ended", onContentEnded)),
  );

  const removeVideoListeners: IO.IO<void> = pipe(
    IO.Do,
    IO.flatMap(() => videoAdapter.off("timeupdate", onTimeUpdate)),
    IO.flatMap(() => videoAdapter.off("ended", onContentEnded)),
  );

  const playContent = (src: string, startAt: number): IO.IO<void> =>
    pipe(
      logger.info(`playContent: seeking to ${startAt}s, src=${src}`),
      IO.flatMap(() =>
        stateRef.modify(
          flow(Transitions.setPhase({ _tag: "Content" }), (state) => ({
            ...state,
            currentSlot: O.none,
          })),
        ),
      ),
      IO.flatMap(() => logger.debug("playContent: phase -> Content, currentSlot -> None")),
      IO.flatMap(() => videoAdapter.enableControls),
      IO.flatMap(() => videoAdapter.seek(src, startAt)),
      IO.flatMap(() => videoAdapter.play),
      IO.flatMap(() => addVideoListeners),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PLAYING)),
      IO.flatMap(() => () => emit({ _tag: "ContentResumed" })),
      IO.flatMap(() => logger.debug("playContent: videoState -> PLAYING, listeners attached")),
    );

  return { addVideoListeners, removeVideoListeners, playContent };
};
