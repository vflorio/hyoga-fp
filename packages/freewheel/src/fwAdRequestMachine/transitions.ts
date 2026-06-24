import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { FwAdSlot, type FwSdk } from "..";
import { getStateSlotForSlotClassId, type MachineState } from "./state";

export const applySlots =
  (sdk: FwSdk.SDK) =>
  (allSlots: ReadonlyArray<FwAdSlot.AdSlot>) =>
  (state: MachineState): MachineState => ({
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
  (slot: FwAdSlot.AdSlot) =>
  (state: MachineState): MachineState => ({
    ...state,
    prerolls: RA.dropLeft(1)(state.prerolls),
    currentSlot: O.some(slot),
    phase: { _tag: "Preroll" },
  });

export const popPostroll =
  (slot: FwAdSlot.AdSlot) =>
  (state: MachineState): MachineState => ({
    ...state,
    postrolls: RA.dropLeft(1)(state.postrolls),
    currentSlot: O.some(slot),
    phase: { _tag: "Postroll" },
  });

export const popMidroll =
  (slot: FwAdSlot.AdSlot, pausedAt: number) =>
  (state: MachineState): MachineState => ({
    ...state,
    midrolls: RA.dropLeft(1)(state.midrolls),
    currentSlot: O.some(slot),
    contentPausedOn: pausedAt,
    phase: { _tag: "Midroll" },
  });

export const popPauseMidroll =
  (pausedAt: number) =>
  (state: MachineState): MachineState => ({
    ...state,
    pauseMidrolls: RA.dropLeft(1)(state.pauseMidrolls),
    contentPausedOn: pausedAt,
    currentSlot: O.none,
    phase: { _tag: "PauseMidroll" },
  });

export const dropOverlayNear =
  (time: number) =>
  (state: MachineState): MachineState => ({
    ...state,
    overlays: pipe(
      state.overlays,
      RA.filter((slot) => Math.abs(slot.getTimePosition() - time) >= 0.5),
    ),
  });
