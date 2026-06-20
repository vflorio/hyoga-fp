import { O } from "..";
import type * as Freewheel from "./freewheel";

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

  readonly prerollSlots: ReadonlyArray<Freewheel.AdSlot>;
  readonly midrollSlots: ReadonlyArray<Freewheel.AdSlot>;
  readonly overlaySlots: ReadonlyArray<Freewheel.AdSlot>;
  readonly postrollSlots: ReadonlyArray<Freewheel.AdSlot>;
  readonly pauseMidrollSlots: ReadonlyArray<Freewheel.AdSlot>;

  readonly contentSrc: string;
  readonly currentSlot: O.Option<Freewheel.AdSlot>; // the ad slot currently playing
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
