import { constVoid, pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { match, P } from "ts-pattern";
import type { ContextRunnerOpContext } from "..";
import * as Transitions from "../transitions";
import type { PlaybackOps } from "./playback";

export interface ControlOps {
  readonly pause: IO.IO<void>;
  readonly resume: IO.IO<void>;
}

export const createControlOps = (context: ContextRunnerOpContext, playback: PlaybackOps): ControlOps => {
  const { getState, setState, videoAdapter, adContext, SDK, logger } = context;

  const pause: IO.IO<void> = pipe(
    getState,
    IO.flatMap((state): IO.IO<void> => {
      const hasPauseMidroll = pipe(
        state.pauseMidrolls,
        RA.head,
        O.exists((slot) => slot.getAdCount() !== 0),
      );

      return match(state.phase)
        .with({ _tag: "Content" }, () =>
          match(hasPauseMidroll)
            .with(true, () =>
              pipe(
                logger.info("[ControlOps] pause: content phase, triggering pause-midroll"),
                IO.flatMap(() => videoAdapter.pause),
                IO.flatMap(() =>
                  pipe(
                    videoAdapter.getCurrentTime,
                    IO.tap((time) =>
                      logger.debug(
                        `[ControlOps] pause: content paused at t=${time.toFixed(2)}s, pausing with pause-midroll`,
                      ),
                    ),
                    IO.flatMap((time) => setState(Transitions.popPauseMidroll(time))),
                  ),
                ),
                IO.flatMap(() => playback.removeVideoListeners),
                IO.flatMap(() => () => {
                  adContext.dispatchEvent(SDK.EVENT_USER_ACTION_NOTIFIED, {
                    action: SDK.EVENT_USER_ACTION_PAUSE_BUTTON_CLICKED,
                  });
                }),
              ),
            )
            .otherwise(() =>
              logger.debug("[ControlOps] pause: content phase, no pause-midroll available, skipping video pause"),
            ),
        )
        .with({ _tag: P.union("Preroll", "Midroll", "Postroll") }, () =>
          pipe(
            logger.debug(`[ControlOps] pause: ad phase=${state.phase._tag}, pausing current ad slot`),
            IO.flatMap(() =>
              pipe(
                state.currentSlot,
                O.match(
                  () => constVoid,
                  (slot) => () => slot.pause(),
                ),
              ),
            ),
          ),
        )
        .otherwise(() =>
          pipe(
            logger.debug(`[ControlOps] pause: phase=${state.phase._tag}, no action`),
            IO.flatMap(() => constVoid),
          ),
        );
    }),
  );

  const resume: IO.IO<void> = pipe(
    getState,
    IO.flatMap(
      (state): IO.IO<void> =>
        match(state.phase)
          .with({ _tag: "PauseMidroll" }, () =>
            pipe(
              logger.info("[ControlOps] resume: PauseMidroll phase, transitioning to Content early"),
              IO.flatMap(() => setState(Transitions.setPhase({ _tag: "Content" }))),
              IO.flatMap(() => () => {
                adContext.dispatchEvent(SDK.EVENT_USER_ACTION_NOTIFIED, {
                  action: SDK.EVENT_USER_ACTION_RESUME_BUTTON_CLICKED,
                });
              }),
            ),
          )
          .with({ _tag: P.union("Preroll", "Midroll", "Postroll") }, () =>
            pipe(
              logger.debug(`[ControlOps] resume: ad phase=${state.phase._tag}, resuming current ad slot`),
              IO.flatMap(() =>
                pipe(
                  state.currentSlot,
                  O.match(
                    () => constVoid,
                    (slot) => () => slot.resume(),
                  ),
                ),
              ),
            ),
          )
          .with({ _tag: "Content" }, () =>
            pipe(
              logger.debug("[ControlOps] resume: Content phase, resuming video playback"),
              IO.flatMap(() => videoAdapter.play),
            ),
          )
          .otherwise(() =>
            pipe(
              logger.debug(`[ControlOps] resume: phase=${state.phase._tag}, no action`),
              IO.flatMap(() => constVoid),
            ),
          ),
    ),
  );

  return { pause, resume };
};
