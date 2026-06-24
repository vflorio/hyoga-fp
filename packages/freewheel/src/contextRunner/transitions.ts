import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { FwAdSlot, type FwSdk } from "..";
import type { FreeWheel } from "../freeWheel";
import { getStateSlotForSlotClassId, type PlaybackPhase, type PlayerState } from "./state";

export const setPhase =
  (phase: PlaybackPhase) =>
  (state: PlayerState): PlayerState => ({ ...state, phase });

export const applySlots =
  (sdk: FwSdk.SDK) =>
  (allSlots: ReadonlyArray<FreeWheel.AdSlot>) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    ...Object.fromEntries(
      pipe(
        allSlots,
        FwAdSlot.groupByTimePositionClass,
        Object.entries,
        RA.map(([key, slots]) => [getStateSlotForSlotClassId(sdk)(key), FwAdSlot.sortByTimePosition(slots)] as const),
        RA.filter(([key]) => key !== "notSupported"),
      ),
    ),
  });

export const popPreroll =
  (slot: FreeWheel.AdSlot) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    prerolls: RA.dropLeft(1)(state.prerolls),
    currentSlot: O.some(slot),
    phase: { _tag: "Preroll" },
  });

export const popPostroll =
  (slot: FreeWheel.AdSlot) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    postrolls: RA.dropLeft(1)(state.postrolls),
    currentSlot: O.some(slot),
    phase: { _tag: "Postroll" },
  });

export const popMidroll =
  (slot: FreeWheel.AdSlot, pausedAt: number) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    midrolls: RA.dropLeft(1)(state.midrolls),
    currentSlot: O.some(slot),
    contentPausedOn: pausedAt,
    phase: { _tag: "Midroll" },
  });

export const popPauseMidroll =
  (pausedAt: number) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    pauseMidrolls: RA.dropLeft(1)(state.pauseMidrolls),
    contentPausedOn: pausedAt,
    currentSlot: O.none,
    phase: { _tag: "PauseMidroll" },
  });

export const dropOverlayNear =
  (time: number) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    overlays: pipe(
      state.overlays,
      RA.filter((slot) => Math.abs(slot.getTimePosition() - time) >= 0.5),
    ),
  });
