import type { Logger } from "@hyoga-fp/core";
import { constVoid, pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as t from "io-ts";
import { match, P } from "ts-pattern";
import type { FwAdSlot } from "..";
import type { EmitEventFn } from ".";
import { getFirstPlayableMidroll, getFirstPlayableOverlay, hasSlots, type State, setPhase } from "./state";
import * as Transitions from "./transitions";

// Model

export interface ContentCurrentTimeDeps {
  readonly logger: Logger;
  readonly emit: EmitEventFn;

  readonly setState: (transition: (state: State) => State) => IO.IO<void>;
  readonly getState: IO.IO<State>;

  // Con questo metodo facciamo sapere che stiamo per riprodurre un ADSlot, quindi di liberare le risorse video
  readonly prepareVideoToShowAdSlot: IO.IO<void>;
}

export const OverlayShown = t.type({ _tag: t.literal("OverlayShown") });
export const MidrollShown = t.type({ _tag: t.literal("MidrollShown") });
export const NoSlotsRemaining = t.type({ _tag: t.literal("NoSlotsRemaining") });

export type OverlayShown = t.TypeOf<typeof OverlayShown>;
export type MidrollShown = t.TypeOf<typeof MidrollShown>;
export type NoSlotsRemaining = t.TypeOf<typeof NoSlotsRemaining>;

export type CurrentTimeEvent = OverlayShown | MidrollShown | NoSlotsRemaining;
export const CurrentTimeEvent = t.union([OverlayShown, MidrollShown, NoSlotsRemaining]);

// Effects

const onOverlay = (deps: ContentCurrentTimeDeps) => (overlay: O.Some<FwAdSlot.AdSlot>) => (time: number) =>
  pipe(
    deps.logger.info(
      `[PlaybackOps] onContentTimeUpdate: overlay triggered at t=${time.toFixed(2)}s (cue=${overlay.value.getTimePosition()}s)`,
    ),
    IO.flatMap(() => deps.setState(Transitions.dropOverlayNear(time))),
    IO.flatMap(() => () => overlay.value.play()),
  );

const onMidroll = (deps: ContentCurrentTimeDeps) => (midroll: O.Some<FwAdSlot.AdSlot>) => (time: number) =>
  pipe(
    deps.logger.info(
      `[PlaybackOps] onContentTimeUpdate: midroll triggered at t=${time.toFixed(2)}s (cue=${midroll.value.getTimePosition()}s), pausing content`,
    ),
    IO.flatMap(() => deps.prepareVideoToShowAdSlot),
    IO.flatMap(() => deps.setState(Transitions.popMidroll(midroll.value, time))),
    IO.flatMap(() => () => midroll.value.play()),
  );

const onNoSlotsRemaining = (deps: ContentCurrentTimeDeps) =>
  pipe(
    deps.logger.debug("[PlaybackOps] onContentTimeUpdate: no timed slots remaining, removing timeupdate listener"),
    IO.flatMap(() => deps.setState(setPhase({ _tag: "Done" }))),
  );

// API

// Questa funzione dispatcha Side-Effects in questi casi:
// 1. Quando abbiamo un overlay da erogare (onOverlay)
// 2. Quando abbiamo un midroll da erogare (onMidroll)
// 3. Quando non ci sono più slot da erogare (onNoSlotsRemaining)
// I Side-Effects con ADSlot
export const getNextSlotByTime = (deps: ContentCurrentTimeDeps) => (time: number) =>
  pipe(
    deps.getState,
    IO.flatMap((state) =>
      pipe(
        IO.of(time),
        IO.flatMap((time) =>
          match({
            overlay: getFirstPlayableOverlay(state)(time),
            midroll: getFirstPlayableMidroll(state)(time),
          })
            .with({ midroll: P.when(O.isSome) }, ({ midroll }) => onMidroll(deps)(midroll)(time))
            .with({ overlay: P.when(O.isSome) }, ({ overlay }) => onOverlay(deps)(overlay)(time))
            .when(
              () => !hasSlots(state),
              () => onNoSlotsRemaining(deps),
            )
            .otherwise(() => constVoid),
        ),
      ),
    ),
  );
