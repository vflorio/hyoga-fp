import { pipe } from "fp-ts/lib/function";
import { O, RA } from ".";
import type { AdSlot, TimePositionClassIdentifiers } from "./freewheel";
import type { PlaybackPhase, PlayerState } from "./model/player";

export const setPhase =
  (phase: PlaybackPhase) =>
  (state: PlayerState): PlayerState => ({ ...state, phase });

export const applySlots =
  (timePositionClassIds: TimePositionClassIdentifiers) =>
  (allSlots: ReadonlyArray<AdSlot>) =>
  (state: PlayerState): PlayerState => {
    const by = (classId: string) =>
      pipe(
        allSlots,
        RA.filter((slot) => slot.getTimePositionClass() === classId),
      );

    return {
      ...state,
      prerollSlots: by(timePositionClassIds.TIME_POSITION_CLASS_PREROLL),
      midrollSlots: by(timePositionClassIds.TIME_POSITION_CLASS_MIDROLL),
      overlaySlots: by(timePositionClassIds.TIME_POSITION_CLASS_OVERLAY),
      postrollSlots: by(timePositionClassIds.TIME_POSITION_CLASS_POSTROLL),
      pauseMidrollSlots: by(timePositionClassIds.TIME_POSITION_CLASS_PAUSE_MIDROLL),
    };
  };

export const popPreroll =
  (slot: AdSlot) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    prerollSlots: RA.dropLeft(1)(state.prerollSlots),
    currentSlot: O.some(slot),
    phase: { _tag: "Preroll" },
  });

export const popPostroll =
  (slot: AdSlot) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    postrollSlots: RA.dropLeft(1)(state.postrollSlots),
    currentSlot: O.some(slot),
    phase: { _tag: "Postroll" },
  });

export const popMidroll =
  (slot: AdSlot, pausedAt: number) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    midrollSlots: RA.dropLeft(1)(state.midrollSlots),
    currentSlot: O.some(slot),
    contentPausedOn: pausedAt,
    phase: { _tag: "Midroll" },
  });

export const popPauseMidroll =
  (pausedAt: number) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    pauseMidrollSlots: RA.dropLeft(1)(state.pauseMidrollSlots),
    contentPausedOn: pausedAt,
    currentSlot: O.none,
    phase: { _tag: "PauseMidroll" },
  });

export const dropOverlayNear =
  (time: number) =>
  (state: PlayerState): PlayerState => ({
    ...state,
    overlaySlots: pipe(
      state.overlaySlots,
      RA.filter((slot) => Math.abs(slot.getTimePosition() - time) >= 0.5),
    ),
  });
