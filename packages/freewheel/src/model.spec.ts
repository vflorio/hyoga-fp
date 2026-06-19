import * as O from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./model";

describe("createInitialState", () => {
  const state = createInitialState("https://cdn.example.com/video.mp4");

  it("sets phase to Init", () => {
    expect(state.phase).toEqual({ _tag: "Init" });
  });

  it("stores the content source URL", () => {
    expect(state.contentSrc).toBe("https://cdn.example.com/video.mp4");
  });

  it("initializes all slot arrays as empty", () => {
    expect(state.prerollSlots).toEqual([]);
    expect(state.midrollSlots).toEqual([]);
    expect(state.overlaySlots).toEqual([]);
    expect(state.postrollSlots).toEqual([]);
    expect(state.pauseMidrollSlots).toEqual([]);
  });

  it("initializes currentSlot as None", () => {
    expect(state.currentSlot).toEqual(O.none);
  });

  it("initializes contentPausedOn to 0", () => {
    expect(state.contentPausedOn).toBe(0);
  });
});
