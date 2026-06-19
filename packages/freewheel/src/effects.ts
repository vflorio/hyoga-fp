import type { IO } from ".";
import type { AdSlot } from "./freewheel";

//FIXME

export const playSlot =
  (slot: AdSlot): IO.IO<void> =>
  () =>
    slot.play();

export const pauseSlot =
  (slot: AdSlot): IO.IO<void> =>
  () =>
    slot.pause();

export const resumeSlot =
  (slot: AdSlot): IO.IO<void> =>
  () =>
    slot.resume();
