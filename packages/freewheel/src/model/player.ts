import * as O from "fp-ts/Option";
import type * as FreeWheel from "../freeWheel";

// Algebraic Data Types

export type PlaybackPhase =
  | { readonly _tag: "Init" } // player created, no request submitted yet
  | { readonly _tag: "Preroll" } // preroll slot is playing
  | { readonly _tag: "Content" } // content video is playing (or paused waiting resume)
  | { readonly _tag: "Midroll" } // content paused, midroll slot playing
  | { readonly _tag: "PauseMidroll" } // user paused, pause-midroll slot playing
  | { readonly _tag: "Postroll" } // postroll slot is playing
  | { readonly _tag: "Done" }; // all done, context disposed

// State

export interface PlayerState {
  readonly phase: PlaybackPhase;

  readonly prerollSlots: ReadonlyArray<FreeWheel.AdSlot>;
  readonly midrollSlots: ReadonlyArray<FreeWheel.AdSlot>;
  readonly overlaySlots: ReadonlyArray<FreeWheel.AdSlot>;
  readonly postrollSlots: ReadonlyArray<FreeWheel.AdSlot>;
  readonly pauseMidrollSlots: ReadonlyArray<FreeWheel.AdSlot>;

  readonly contentSrc: string;
  readonly currentSlot: O.Option<FreeWheel.AdSlot>; // the ad slot currently playing
  readonly contentPausedOn: number; // resume position for mid/pause-midroll
}

export const createInitialState = (contentSrc: string): PlayerState => ({
  phase: { _tag: "Init" },
  prerollSlots: [],
  midrollSlots: [],
  overlaySlots: [],
  postrollSlots: [],
  pauseMidrollSlots: [],
  currentSlot: O.none,
  contentSrc,
  contentPausedOn: 0,
});
