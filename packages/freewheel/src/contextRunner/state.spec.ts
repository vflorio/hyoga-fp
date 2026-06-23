import * as O from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./state";

describe("createInitialState", () => {
  const state = createInitialState("https://cdn.example.com/video.mp4");

  it("sets phase to Init", () => {
    expect(state.phase).toEqual({ _tag: "Init" });
  });

  it("stores the content source URL", () => {
    expect(state.contentSrc).toBe("https://cdn.example.com/video.mp4");
  });

  it("initializes all slot arrays as empty", () => {
    expect(state.prerolls).toEqual([]);
    expect(state.midrolls).toEqual([]);
    expect(state.overlays).toEqual([]);
    expect(state.postrolls).toEqual([]);
    expect(state.pauseMidrolls).toEqual([]);
  });

  it("initializes currentSlot as None", () => {
    expect(state.currentSlot).toEqual(O.none);
  });

  it("initializes contentPausedOn to 0", () => {
    expect(state.contentPausedOn).toBe(0);
  });
});
