import * as O from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import type { AdSlot } from "../freewheel";
import type { PlayerState } from "../model";
import * as Transitions from "../transitions";

// ── Helpers ────────────────────────────────────────────────────────────────

const makeSlot = (timePositionClass: string, timePosition = 0): AdSlot => ({
  getTimePositionClass: () => timePositionClass,
  getTimePosition: () => timePosition,
  getAdCount: () => 1,
  play: () => {},
  pause: () => {},
  resume: () => {},
});

const IDS = {
  TIME_POSITION_CLASS_PREROLL: "preroll",
  TIME_POSITION_CLASS_MIDROLL: "midroll",
  TIME_POSITION_CLASS_OVERLAY: "overlay",
  TIME_POSITION_CLASS_POSTROLL: "postroll",
  TIME_POSITION_CLASS_PAUSE_MIDROLL: "pause_midroll",
} as const;

const base: PlayerState = {
  phase: { _tag: "Init" },
  prerollSlots: [],
  midrollSlots: [],
  overlaySlots: [],
  postrollSlots: [],
  pauseMidrollSlots: [],
  currentSlot: O.none,
  contentSrc: "content.mp4",
  contentPausedOn: 0,
};

// ── setPhase ───────────────────────────────────────────────────────────────

describe("setPhase", () => {
  it("updates the phase and leaves everything else unchanged", () => {
    const result = Transitions.setPhase({ _tag: "Content" })(base);
    expect(result.phase).toEqual({ _tag: "Content" });
    expect(result.contentSrc).toBe("content.mp4");
    expect(result.prerollSlots).toBe(base.prerollSlots);
  });
});

// ── applySlots ─────────────────────────────────────────────────────────────

describe("applySlots", () => {
  it("correctly categorises slots by time-position class", () => {
    const slots = [
      makeSlot("preroll"),
      makeSlot("midroll", 6),
      makeSlot("overlay", 10),
      makeSlot("postroll", 120),
      makeSlot("pause_midroll"),
    ];

    const result = Transitions.applySlots(IDS)(slots)(base);

    expect(result.prerollSlots).toHaveLength(1);
    expect(result.midrollSlots).toHaveLength(1);
    expect(result.overlaySlots).toHaveLength(1);
    expect(result.postrollSlots).toHaveLength(1);
    expect(result.pauseMidrollSlots).toHaveLength(1);
  });

  it("puts slots with unknown class into no category", () => {
    const slots = [makeSlot("unknown")];
    const result = Transitions.applySlots(IDS)(slots)(base);
    expect(result.prerollSlots).toHaveLength(0);
    expect(result.midrollSlots).toHaveLength(0);
  });

  it("handles an empty slot array", () => {
    const result = Transitions.applySlots(IDS)([])(base);
    expect(result.prerollSlots).toHaveLength(0);
    expect(result.midrollSlots).toHaveLength(0);
  });
});

// ── popPreroll ─────────────────────────────────────────────────────────────

describe("popPreroll", () => {
  it("removes the first preroll slot and sets it as currentSlot", () => {
    const slot1 = makeSlot("preroll");
    const slot2 = makeSlot("preroll");
    const state: PlayerState = { ...base, prerollSlots: [slot1, slot2] };

    const result = Transitions.popPreroll(slot1)(state);

    expect(result.prerollSlots).toHaveLength(1);
    expect(result.prerollSlots[0]).toBe(slot2);
    expect(O.isSome(result.currentSlot) && result.currentSlot.value).toBe(
      slot1,
    );
    expect(result.phase).toEqual({ _tag: "Preroll" });
  });
});

// ── popPostroll ────────────────────────────────────────────────────────────

describe("popPostroll", () => {
  it("removes the first postroll slot and sets phase to Postroll", () => {
    const slot = makeSlot("postroll");
    const state: PlayerState = { ...base, postrollSlots: [slot] };

    const result = Transitions.popPostroll(slot)(state);

    expect(result.postrollSlots).toHaveLength(0);
    expect(O.isSome(result.currentSlot) && result.currentSlot.value).toBe(slot);
    expect(result.phase).toEqual({ _tag: "Postroll" });
  });
});

// ── popMidroll ─────────────────────────────────────────────────────────────

describe("popMidroll", () => {
  it("removes the first midroll slot, saves pausedAt, and sets phase to Midroll", () => {
    const slot = makeSlot("midroll", 6);
    const state: PlayerState = { ...base, midrollSlots: [slot] };

    const result = Transitions.popMidroll(slot, 6.1)(state);

    expect(result.midrollSlots).toHaveLength(0);
    expect(result.contentPausedOn).toBe(6.1);
    expect(O.isSome(result.currentSlot) && result.currentSlot.value).toBe(slot);
    expect(result.phase).toEqual({ _tag: "Midroll" });
  });
});

// ── popPauseMidroll ────────────────────────────────────────────────────────

describe("popPauseMidroll", () => {
  it("removes the first pause-midroll slot, saves pausedAt, sets currentSlot to none, phase to PauseMidroll", () => {
    const slot = makeSlot("pause_midroll");
    const state: PlayerState = { ...base, pauseMidrollSlots: [slot] };

    const result = Transitions.popPauseMidroll(12.5)(state);

    expect(result.pauseMidrollSlots).toHaveLength(0);
    expect(result.contentPausedOn).toBe(12.5);
    expect(O.isNone(result.currentSlot)).toBe(true);
    expect(result.phase).toEqual({ _tag: "PauseMidroll" });
  });
});

// ── dropOverlayNear ────────────────────────────────────────────────────────

describe("dropOverlayNear", () => {
  it("removes overlay slots within ±0.5 s of the given time", () => {
    const near = makeSlot("overlay", 10);
    const far = makeSlot("overlay", 20);
    const state: PlayerState = { ...base, overlaySlots: [near, far] };

    const result = Transitions.dropOverlayNear(10)(state);

    expect(result.overlaySlots).toHaveLength(1);
    expect(result.overlaySlots[0]).toBe(far);
  });

  it("keeps overlay slots exactly at the 0.5 s boundary", () => {
    const exact = makeSlot("overlay", 10.5);
    const state: PlayerState = { ...base, overlaySlots: [exact] };

    const result = Transitions.dropOverlayNear(10)(state);

    // Math.abs(10.5 - 10) = 0.5, which is NOT < 0.5 → kept
    expect(result.overlaySlots).toHaveLength(1);
  });

  it("does nothing when there are no overlay slots", () => {
    const result = Transitions.dropOverlayNear(5)(base);
    expect(result.overlaySlots).toHaveLength(0);
  });
});
