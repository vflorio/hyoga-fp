import type { Logger } from "@hyoga-fp/core";
import { match, P } from "ts-pattern";
import { constVoid, flow, IO, IORef, O, pipe, RA, T } from ".";
import * as Effects from "./effects";
import type * as FreeWheel from "./freewheel";
import * as Model from "./model";
import * as Transitions from "./transitions";

export interface VideoPlayer {
  readonly play: IO.IO<void>;
  readonly pause: IO.IO<void>;
  readonly getCurrentTime: IO.IO<number>;
  readonly seek: (src: string, at: number) => IO.IO<void>;
  readonly enableControls: IO.IO<void>;
  readonly getSrc: IO.IO<string>;
  readonly on: (
    event: "timeupdate" | "ended",
    handler: () => void,
  ) => IO.IO<void>;
  readonly off: (
    event: "timeupdate" | "ended",
    handler: () => void,
  ) => IO.IO<void>;
}

export interface PlayerDeps {
  readonly logger: Logger;
  // Questa viene usata solo per le costanti dei vari IDs necessari per usare l'AdManager di FreeWheel
  readonly SDK: FreeWheel.SDK;
  // Idealmente, appena creato e inizializzato
  readonly adContext: FreeWheel.AdContext;
  // Interfaccia di astrazione per operazioni su un elemento video HTML5
  readonly video: VideoPlayer;
  // Quando il player ha finito di riprodurre tutto il contenuto e gli annunci
  readonly onComplete: IO.IO<void>;
  // Quando un overlay viene mostrato, così da poter eventualmente spostare il contenuto sottostante
  readonly onOverlayShown: IO.IO<void>;
}

export interface Player {
  requestAds: T.Task<void>;
  pause: IO.IO<void>;
  resume: IO.IO<void>;
}

export const createPlayer = (deps: PlayerDeps): Player => {
  const { adContext, video, SDK, onComplete, onOverlayShown, logger } = deps;

  const videoSrc = video.getSrc();

  const stateRef = IORef.newIORef<Model.PlayerState>(
    Model.createInitialState(videoSrc),
  )();

  const addVideoListeners: IO.IO<void> = () => {
    video.on("timeupdate", onTimeUpdate)();
    video.on("ended", onContentEnded)();
  };

  const removeVideoListeners: IO.IO<void> = () => {
    video.off("timeupdate", onTimeUpdate)();
    video.off("ended", onContentEnded)();
  };

  // Set the video element's src, seek to startAt, and press play
  const playContent = (src: string, startAt: number): IO.IO<void> =>
    pipe(
      logger.info(`playing content (resuming at ${startAt}s)`),
      IO.flatMap(() =>
        stateRef.modify(
          flow(Transitions.setPhase({ _tag: "Content" }), (state) => ({
            ...state,
            currentSlot: O.none,
          })),
        ),
      ),
      IO.flatMap(() => video.enableControls),
      IO.flatMap(() => video.seek(src, startAt)),
      IO.flatMap(() => video.play),
      IO.flatMap(() => addVideoListeners),
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PLAYING)),
    );

  // Pop and play the first preroll slot, or start content if none remain
  const playPreroll: IO.IO<void> = pipe(
    stateRef.read,
    IO.flatMap((state) =>
      pipe(
        RA.head(state.prerollSlots),
        O.match(
          () => playContent(state.contentSrc, 0), // no more prerolls -> content
          (slot) =>
            pipe(
              logger.info("playing preroll"),
              IO.flatMap(() => stateRef.modify(Transitions.popPreroll(slot))),
              IO.flatMap(() => Effects.playSlot(slot)),
            ),
        ),
      ),
    ),
  );

  const playPostroll: IO.IO<void> = pipe(
    stateRef.read,
    IO.flatMap((state) =>
      pipe(
        RA.head(state.postrollSlots),
        O.match(
          () => cleanUp, // no more postrolls -> cleanup
          (slot) =>
            pipe(
              logger.info("playing postroll"),
              IO.flatMap(() => stateRef.modify(Transitions.popPostroll(slot))),
              IO.flatMap(() => Effects.playSlot(slot)),
            ),
        ),
      ),
    ),
  );

  const onSlotEnded = (event: { slot: FreeWheel.AdSlot }): void => {
    const classId = event.slot.getTimePositionClass();

    pipe(
      logger.info(`slot ended: ${classId}`),
      IO.flatMap(
        (): IO.IO<void> =>
          match(classId)
            .with(SDK.TIME_POSITION_CLASS_PREROLL, () => playPreroll)
            .with(SDK.TIME_POSITION_CLASS_POSTROLL, () => playPostroll)
            .with(SDK.TIME_POSITION_CLASS_MIDROLL, () => restoreAfterMidroll)
            .with(
              SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
              () => restoreAfterPauseMidroll,
            )
            .otherwise(() => constVoid),
      ),
    )();
  };

  const restoreAfterMidroll: IO.IO<void> = pipe(
    stateRef.read,
    IO.flatMap((state) =>
      match(state.phase)
        .with({ _tag: "Midroll" }, () =>
          pipe(
            logger.info(`resuming content at ${state.contentPausedOn}s`),
            IO.flatMap(() =>
              playContent(state.contentSrc, state.contentPausedOn),
            ),
          ),
        )
        .otherwise(() => constVoid),
    ),
  );

  // Pause-midroll has two cases depending on whether the user clicked Resume before or after the ad finished:
  //   PauseMidroll -> user hasn't resumed yet: restore video but keep it paused
  //   Content      -> user already resumed:    restore video AND play it
  const restoreAfterPauseMidroll: IO.IO<void> = pipe(
    stateRef.read,
    IO.flatMap((state) => {
      const resumeAt = state.contentPausedOn;
      const wasUserResumed = state.phase._tag === "Content";

      return pipe(
        // ensure we're in Content phase
        match(state.phase)
          .with({ _tag: "Content" }, () => constVoid)
          .otherwise(() =>
            stateRef.modify(Transitions.setPhase({ _tag: "Content" })),
          ),

        IO.flatMap(() => video.seek(state.contentSrc, resumeAt)),
        IO.flatMap(() => addVideoListeners),
        IO.flatMap(() =>
          match(wasUserResumed)
            // user already resumed -> play now
            .with(true, () => video.play)
            // user hasn't resumed -> stay paused
            .otherwise(() => constVoid),
        ),
      );
    }),
  );

  // SDK content pause / resume requests

  const onContentPauseRequest = (): void =>
    pipe(
      removeVideoListeners,
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PAUSED)),
    )();

  const onContentResumeRequest = (): void =>
    pipe(
      addVideoListeners,
      IO.flatMap(() => () => adContext.setVideoState(SDK.VIDEO_STATE_PLAYING)),
    )();

  // Fired on every video timeupdate event
  // Checks whether an overlay or midroll is due at the current playback time
  const onTimeUpdate = (): void => {
    pipe(
      stateRef.read,
      IO.flatMap((state) =>
        pipe(
          video.getCurrentTime,
          IO.flatMap((time) => {
            const overlay = pipe(
              state.overlaySlots,
              RA.findFirst(
                (slot) => Math.abs(slot.getTimePosition() - time) < 0.5,
              ),
            );

            const midroll = pipe(
              state.midrollSlots,
              RA.findFirst(
                (slot) => Math.abs(slot.getTimePosition() - time) < 0.5,
              ),
            );

            return (
              match({ overlay, midroll })
                .with({ overlay: P.when(O.isSome) }, ({ overlay }) =>
                  pipe(
                    stateRef.modify(Transitions.dropOverlayNear(time)),
                    IO.flatMap(() => Effects.playSlot(overlay.value)),
                    IO.flatMap(() => onOverlayShown),
                  ),
                )
                .with({ midroll: P.when(O.isSome) }, ({ midroll }) =>
                  pipe(
                    logger.info(`playing midroll (resume at ${time}s)`),
                    IO.flatMap(() => removeVideoListeners),
                    IO.flatMap(() =>
                      stateRef.modify(
                        Transitions.popMidroll(midroll.value, time),
                      ),
                    ),
                    IO.flatMap(() => Effects.playSlot(midroll.value)),
                  ),
                )
                // optimisation: remove timeupdate listener when no timed slots remain
                .otherwise(() =>
                  state.overlaySlots.length === 0 &&
                  state.midrollSlots.length === 0
                    ? video.off("timeupdate", onTimeUpdate)
                    : constVoid,
                )
            );
          }),
        ),
      ),
    )();
  };

  // content ended

  const onContentEnded = (): void =>
    pipe(
      logger.info("content ended"),
      IO.flatMap(() => video.off("ended", onContentEnded)),
      IO.flatMap(
        () => () => adContext.setVideoState(SDK.VIDEO_STATE_COMPLETED),
      ),
      IO.flatMap(() => playPostroll),
    )();

  // cleanup

  const cleanUp: IO.IO<void> = pipe(
    stateRef.modify(Transitions.setPhase({ _tag: "Done" })),
    IO.flatMap(() => () => {
      adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, onSlotEnded);
      adContext.removeEventListener(
        SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST,
        onContentPauseRequest,
      );
      adContext.removeEventListener(
        SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST,
        onContentResumeRequest,
      );
      adContext.dispose();
    }),
    IO.flatMap(() => onComplete),
  );

  // AD request

  const awaitSlots: T.Task<ReadonlyArray<FreeWheel.AdSlot>> = () =>
    new Promise((resolve) => {
      const handler = (event: { success: boolean }) => {
        adContext.removeEventListener(SDK.EVENT_REQUEST_COMPLETE, handler);
        resolve(event.success ? adContext.getTemporalSlots() : []);
      };

      adContext.addEventListener(SDK.EVENT_REQUEST_COMPLETE, handler);
      adContext.submitRequest();
    });

  // called when the user clicks Play for the first time
  // TODO: Confrontare con quelle di Hyoga
  const requestAds: T.Task<void> = pipe(
    // configure the ad context and register SDK-level listeners (IO -> Task)
    T.fromIO(() => {
      // TODO: Docs
      adContext.addTemporalSlot("Preroll_1", SDK.ADUNIT_PREROLL, 0);
      adContext.addTemporalSlot("Midroll_1", SDK.ADUNIT_MIDROLL, 6);
      adContext.addTemporalSlot("Overlay_1", SDK.ADUNIT_OVERLAY, 10);
      adContext.addTemporalSlot("Overlay_2", SDK.ADUNIT_OVERLAY, 20);
      adContext.addTemporalSlot("Postroll_1", SDK.ADUNIT_POSTROLL, 120);
      adContext.addTemporalSlot("pause_midroll_1", SDK.ADUNIT_PAUSE_MIDROLL, 0);
      // TODO: Docs
      adContext.registerVideoDisplayBase("displayBase");
      // TODO: Docs
      adContext.addKeyValue("skippable", "enabled");
      // TODO: Docs
      adContext.setParameter(
        "extension.skippableAd.enabled",
        true,
        SDK.PARAMETER_LEVEL_GLOBAL,
      );

      adContext.addEventListener(
        SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST,
        onContentPauseRequest,
      );
      adContext.addEventListener(
        SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST,
        onContentResumeRequest,
      );
      adContext.addEventListener(SDK.EVENT_SLOT_ENDED, onSlotEnded);
    }),
    // submit and await the response
    T.flatMap(() => awaitSlots),
    // update immutable state, then kick off the preroll flatMap
    T.flatMap((slots) =>
      T.fromIO(
        pipe(
          stateRef.modify(
            Transitions.applySlots({
              TIME_POSITION_CLASS_PREROLL: SDK.TIME_POSITION_CLASS_PREROLL,
              TIME_POSITION_CLASS_MIDROLL: SDK.TIME_POSITION_CLASS_MIDROLL,
              TIME_POSITION_CLASS_OVERLAY: SDK.TIME_POSITION_CLASS_OVERLAY,
              TIME_POSITION_CLASS_POSTROLL: SDK.TIME_POSITION_CLASS_POSTROLL,
              TIME_POSITION_CLASS_PAUSE_MIDROLL:
                SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
            })(slots),
          ),
          IO.flatMap(() => playPreroll),
        ),
      ),
    ),
  );

  // pause / resume
  const pause: IO.IO<void> = pipe(
    stateRef.read,
    IO.flatMap((state): IO.IO<void> => {
      const hasPauseMidroll =
        state.pauseMidrollSlots.length > 0 &&
        state.pauseMidrollSlots[0].getAdCount() !== 0;

      return (
        match(state.phase)
          .with({ _tag: "Content" }, () =>
            match(hasPauseMidroll)
              .with(true, () =>
                pipe(
                  logger.info("pause: triggering pause-midroll"),
                  IO.flatMap(() => video.pause),
                  IO.flatMap(() =>
                    pipe(
                      video.getCurrentTime,
                      IO.flatMap((t) =>
                        stateRef.modify(Transitions.popPauseMidroll(t)),
                      ),
                    ),
                  ),
                  IO.flatMap(() => removeVideoListeners),
                  IO.flatMap(() => () => {
                    adContext.dispatchEvent(SDK.EVENT_USER_ACTION_NOTIFIED, {
                      action: SDK.EVENT_USER_ACTION_PAUSE_BUTTON_CLICKED,
                    });
                  }),
                ),
              )
              .otherwise(() => video.pause),
          )
          // Pause the currently playing ad slot
          .with({ _tag: P.union("Preroll", "Midroll", "Postroll") }, () =>
            pipe(
              state.currentSlot,
              O.match(() => constVoid, Effects.pauseSlot),
            ),
          )
          .otherwise(() => constVoid)
      );
    }),
  );

  const resume: IO.IO<void> = pipe(
    stateRef.read,
    IO.flatMap(
      (state): IO.IO<void> =>
        match(state.phase)
          // User resumed before the pause-midroll ad finished.
          // Transition to Content now; the video will play in restoreAfterPauseMidroll.
          .with({ _tag: "PauseMidroll" }, () =>
            pipe(
              stateRef.modify(Transitions.setPhase({ _tag: "Content" })),
              IO.flatMap(() => () => {
                adContext.dispatchEvent(SDK.EVENT_USER_ACTION_NOTIFIED, {
                  action: SDK.EVENT_USER_ACTION_RESUME_BUTTON_CLICKED,
                });
              }),
            ),
          )
          // Resume the paused ad slot
          .with({ _tag: P.union("Preroll", "Midroll", "Postroll") }, () =>
            pipe(
              state.currentSlot,
              O.match(() => constVoid, Effects.resumeSlot),
            ),
          )
          // Content phase: video element is paused, just play it
          .with({ _tag: "Content" }, () => video.play)
          .otherwise(() => constVoid),
    ),
  );

  return {
    requestAds,
    pause,
    resume,
  };
};
