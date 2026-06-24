import * as O from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import type { FwAdSlot, FwSdk } from "..";
import { createInitialState, type PlayerState } from "./state";
import {
  applySlots,
  dropOverlayNear,
  popMidroll,
  popPauseMidroll,
  popPostroll,
  popPreroll,
  setPhase,
} from "./transitions";

// --- Test helpers ---

const mockSlot = (timePositionClass: string, timePosition = 0): FwAdSlot.AdSlot => ({
  getTimePositionClass: () => timePositionClass,
  getTimePosition: () => timePosition,
  getAdCount: () => 1,
  play: () => {},
  pause: () => {},
  resume: () => {},
});

const sdk = {
  TIME_POSITION_CLASS_PREROLL: "preroll",
  TIME_POSITION_CLASS_MIDROLL: "midroll",
  TIME_POSITION_CLASS_OVERLAY: "overlay",
  TIME_POSITION_CLASS_POSTROLL: "postroll",
  TIME_POSITION_CLASS_PAUSE_MIDROLL: "pause_midroll",
} as FwSdk.SDK;

const baseState: PlayerState = createInitialState("video.mp4");

// --- Tests ---

describe("setPhase", () => {
  it("transitions to Content phase", () => {
    const result = setPhase({ _tag: "Content" })(baseState);
    expect(result.phase).toEqual({ _tag: "Content" });
  });

  it("transitions to Done phase", () => {
    const result = setPhase({ _tag: "Done" })(baseState);
    expect(result.phase).toEqual({ _tag: "Done" });
  });

  it("preserves all other state fields", () => {
    const result = setPhase({ _tag: "Content" })(baseState);
    expect(result.contentSrc).toBe(baseState.contentSrc);
    expect(result.prerolls).toBe(baseState.prerolls);
  });
});

describe("applySlots", () => {
  const preroll = mockSlot("preroll");
  const midroll = mockSlot("midroll");
  const overlay = mockSlot("overlay", 10);
  const postroll = mockSlot("postroll");
  const pauseMidroll = mockSlot("pause_midroll");

  const allSlots = [preroll, midroll, overlay, postroll, pauseMidroll];

  it("categorizes slots into their respective buckets", () => {
    const result = applySlots(sdk)(allSlots)(baseState);

    expect(result.prerolls).toEqual([preroll]);
    expect(result.midrolls).toEqual([midroll]);
    expect(result.overlays).toEqual([overlay]);
    expect(result.postrolls).toEqual([postroll]);
    expect(result.pauseMidrolls).toEqual([pauseMidroll]);
  });

  it("handles multiple slots of the same type", () => {
    const pre1 = mockSlot("preroll");
    const pre2 = mockSlot("preroll");
    const result = applySlots(sdk)([pre1, pre2])(baseState);

    expect(result.prerolls).toEqual([pre1, pre2]);
    expect(result.midrolls).toEqual([]);
  });

  it("results in empty arrays when no slots match", () => {
    const result = applySlots(sdk)([])(baseState);

    expect(result.prerolls).toEqual([]);
    expect(result.midrolls).toEqual([]);
    expect(result.overlays).toEqual([]);
    expect(result.postrolls).toEqual([]);
    expect(result.pauseMidrolls).toEqual([]);
  });
});

describe("popPreroll", () => {
  const slot = mockSlot("preroll");
  const stateWithPrerolls: PlayerState = {
    ...baseState,
    prerolls: [slot, mockSlot("preroll")],
  };

  it("removes the first preroll slot", () => {
    const result = popPreroll(slot)(stateWithPrerolls);
    expect(result.prerolls).toHaveLength(1);
  });

  it("sets currentSlot to the given slot", () => {
    const result = popPreroll(slot)(stateWithPrerolls);
    expect(result.currentSlot).toEqual(O.some(slot));
  });

  it("transitions to Preroll phase", () => {
    const result = popPreroll(slot)(stateWithPrerolls);
    expect(result.phase).toEqual({ _tag: "Preroll" });
  });
});

describe("popPostroll", () => {
  const slot = mockSlot("postroll");
  const stateWithPostrolls: PlayerState = {
    ...baseState,
    postrolls: [slot, mockSlot("postroll")],
  };

  it("removes the first postroll slot", () => {
    const result = popPostroll(slot)(stateWithPostrolls);
    expect(result.postrolls).toHaveLength(1);
  });

  it("sets currentSlot to the given slot", () => {
    const result = popPostroll(slot)(stateWithPostrolls);
    expect(result.currentSlot).toEqual(O.some(slot));
  });

  it("transitions to Postroll phase", () => {
    const result = popPostroll(slot)(stateWithPostrolls);
    expect(result.phase).toEqual({ _tag: "Postroll" });
  });
});

describe("popMidroll", () => {
  const slot = mockSlot("midroll");
  const stateWithMidrolls: PlayerState = {
    ...baseState,
    midrolls: [slot, mockSlot("midroll")],
    phase: { _tag: "Content" },
  };

  it("removes the first midroll slot", () => {
    const result = popMidroll(slot, 42.5)(stateWithMidrolls);
    expect(result.midrolls).toHaveLength(1);
  });

  it("sets currentSlot to the given slot", () => {
    const result = popMidroll(slot, 42.5)(stateWithMidrolls);
    expect(result.currentSlot).toEqual(O.some(slot));
  });

  it("records the content pause position", () => {
    const result = popMidroll(slot, 42.5)(stateWithMidrolls);
    expect(result.contentPausedOn).toBe(42.5);
  });

  it("transitions to Midroll phase", () => {
    const result = popMidroll(slot, 42.5)(stateWithMidrolls);
    expect(result.phase).toEqual({ _tag: "Midroll" });
  });
});

describe("popPauseMidroll", () => {
  const pauseSlot = mockSlot("pause_midroll");
  const stateWithPauseMidrolls: PlayerState = {
    ...baseState,
    pauseMidrolls: [pauseSlot, mockSlot("pause_midroll")],
    phase: { _tag: "Content" },
  };

  it("removes the first pause-midroll slot", () => {
    const result = popPauseMidroll(30)(stateWithPauseMidrolls);
    expect(result.pauseMidrolls).toHaveLength(1);
  });

  it("sets currentSlot to None (pause-midrolls don't track a slot ref)", () => {
    const result = popPauseMidroll(30)(stateWithPauseMidrolls);
    expect(result.currentSlot).toEqual(O.none);
  });

  it("records the content pause position", () => {
    const result = popPauseMidroll(30)(stateWithPauseMidrolls);
    expect(result.contentPausedOn).toBe(30);
  });

  it("transitions to PauseMidroll phase", () => {
    const result = popPauseMidroll(30)(stateWithPauseMidrolls);
    expect(result.phase).toEqual({ _tag: "PauseMidroll" });
  });
});

describe("dropOverlayNear", () => {
  const overlay10 = mockSlot("overlay", 10);
  const overlay20 = mockSlot("overlay", 20);
  const overlay30 = mockSlot("overlay", 30);

  const stateWithOverlays: PlayerState = {
    ...baseState,
    overlays: [overlay10, overlay20, overlay30],
  };

  it("removes overlays within 0.5s of the given time", () => {
    const result = dropOverlayNear(10.2)(stateWithOverlays);
    expect(result.overlays).toEqual([overlay20, overlay30]);
  });

  it("keeps overlays exactly 0.5s away", () => {
    const result = dropOverlayNear(9.5)(stateWithOverlays);
    expect(result.overlays).toEqual([overlay10, overlay20, overlay30]);
  });

  it("removes nothing when no overlays are near", () => {
    const result = dropOverlayNear(15)(stateWithOverlays);
    expect(result.overlays).toEqual([overlay10, overlay20, overlay30]);
  });

  it("can remove multiple overlays at the same time position", () => {
    const overlay10b = mockSlot("overlay", 10.1);
    const state: PlayerState = {
      ...baseState,
      overlays: [overlay10, overlay10b, overlay20],
    };
    const result = dropOverlayNear(10)(state);
    expect(result.overlays).toEqual([overlay20]);
  });
});
