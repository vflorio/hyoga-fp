import { constVoid, flow, pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { match, P } from "ts-pattern";
import type { FwAdSlot } from "../..";
import type { ContextRunnerOpContext } from "..";
import type { PlayerState } from "../state";
import * as Transitions from "../transitions";

export interface PlaybackOps {
  readonly addVideoListeners: IO.IO<void>;
  readonly removeVideoListeners: IO.IO<void>;
  readonly playContent: (src: string, startAt: number) => IO.IO<void>;
}

export const createPlaybackOps = (
  context: ContextRunnerOpContext,
  dispose: IO.IO<void>,
  getPlayPostroll: () => IO.IO<void>, // Cambia a runtime, va trovato un modo alternativo
): PlaybackOps => {
  const { getState, setState, videoAdapter, adContext, SDK, logger, emit } = context;

  const onContentTimeUpdate = (): void => {
    const selectOverlay = (state: PlayerState, time: number) =>
      pipe(
        state.overlays,
        RA.findFirst((slot) => Math.abs(slot.getTimePosition() - time) < 0.5),
      );

    const selectMidroll = (state: PlayerState, time: number) =>
      pipe(
        state.midrolls,
        RA.findFirst((slot) => Math.abs(slot.getTimePosition() - time) < 0.5),
      );

    const onOverlay = (overlay: O.Some<FwAdSlot.AdSlot>, time: number) =>
      pipe(
        logger.info(
          `[PlaybackOps] onContentTimeUpdate: overlay triggered at t=${time.toFixed(2)}s (cue=${overlay.value.getTimePosition()}s)`,
        ),
        IO.flatMap(() => setState(Transitions.dropOverlayNear(time))),
        IO.flatMap(() => () => overlay.value.play()),
        IO.flatMap(() => () => emit({ _tag: "OverlayShown" })),
      );

    const onMidroll = (midroll: O.Some<FwAdSlot.AdSlot>, time: number) =>
      pipe(
        logger.info(
          `[PlaybackOps] onContentTimeUpdate: midroll triggered at t=${time.toFixed(2)}s (cue=${midroll.value.getTimePosition()}s), pausing content`,
        ),
        IO.flatMap(() => removeVideoListeners),
        IO.flatMap(() => setState(Transitions.popMidroll(midroll.value, time))),
        IO.flatMap(() => () => midroll.value.play()),
      );

    const onNoSlotsRemaining = () =>
      pipe(
        logger.debug("[PlaybackOps] onContentTimeUpdate: no timed slots remaining, removing timeupdate listener"),
        IO.flatMap(() => removeVideoListeners),
        IO.flatMap(() => dispose),
      );

    pipe(
      getState,
      IO.flatMap((state) =>
        pipe(
          videoAdapter.getCurrentTime,
          IO.flatMap((time) =>
            match({
              overlay: selectOverlay(state, time),
              midroll: selectMidroll(state, time),
            })
              .with({ midroll: P.when(O.isSome) }, ({ midroll }) => onMidroll(midroll, time))
              .with({ overlay: P.when(O.isSome) }, ({ overlay }) => onOverlay(overlay, time))
              .when(
                () =>
                  [
                    state.overlays.length,
                    state.midrolls.length,
                    state.prerolls.length,
                    state.postrolls.length,
                    state.pauseMidrolls.length,
                  ].reduce((prev, current) => prev + current, 0) === 0,
                () => onNoSlotsRemaining(),
              )
              .otherwise(() => constVoid),
          ),
        ),
      ),
    )();
  };

  const onContentEnded = (): void =>
    pipe(
      logger.info("[PlaybackOps] onContentEnded: content video ended, starting postroll chain"),
      IO.flatMap(() => videoAdapter.off("ended", onContentEnded)),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_COMPLETED)),
      IO.flatMap(() => getPlayPostroll()),
    )();

  const addVideoListeners: IO.IO<void> = pipe(
    IO.Do,
    IO.flatMap(() => videoAdapter.on("timeupdate", onContentTimeUpdate)),
    IO.flatMap(() => videoAdapter.on("ended", onContentEnded)),
  );

  const removeVideoListeners: IO.IO<void> = pipe(
    IO.Do,
    IO.flatMap(() => videoAdapter.off("timeupdate", onContentTimeUpdate)),
    IO.flatMap(() => videoAdapter.off("ended", onContentEnded)),
  );

  const playContent = (src: string, startAt: number): IO.IO<void> =>
    pipe(
      logger.info(`[PlaybackOps] playContent: seeking to ${startAt}s, src=${src}`),
      IO.flatMap(() =>
        setState(
          flow(Transitions.setPhase({ _tag: "Content" }), (state) => ({
            ...state,
            currentSlot: O.none,
          })),
        ),
      ),
      IO.flatMap(() => videoAdapter.enableControls),
      IO.flatMap(() => videoAdapter.seek(src, startAt)),
      IO.flatMap(() => videoAdapter.play),
      IO.flatMap(() => addVideoListeners),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PLAYING)),
      IO.flatMap(() => () => emit({ _tag: "ContentResumed" })),
    );

  return { addVideoListeners, removeVideoListeners, playContent };
};
