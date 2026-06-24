import * as O from "fp-ts/Option";
import { match } from "ts-pattern";
import type { FwAdSlot, FwSdk } from "..";

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

  readonly prerolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly midrolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly overlays: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly postrolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly pauseMidrolls: ReadonlyArray<FwAdSlot.AdSlot>;

  readonly contentSrc: string;
  readonly currentSlot: O.Option<FwAdSlot.AdSlot>; // the ad slot currently playing
  readonly contentPausedOn: number; // resume position for mid/pause-midroll
}

export const createInitialState = (contentSrc: string): PlayerState => ({
  phase: { _tag: "Init" },
  prerolls: [],
  midrolls: [],
  overlays: [],
  postrolls: [],
  pauseMidrolls: [],
  currentSlot: O.none,
  contentSrc,
  contentPausedOn: 0,
});

export const getStateSlotForSlotClassId =
  (sdk: FwSdk.SDK) =>
  (classId: string): keyof PlayerState | "notSupported" =>
    match(classId)
      .with(sdk.TIME_POSITION_CLASS_PREROLL, () => "prerolls" as const)
      .with(sdk.TIME_POSITION_CLASS_MIDROLL, () => "midrolls" as const)
      .with(sdk.TIME_POSITION_CLASS_OVERLAY, () => "overlays" as const)
      .with(sdk.TIME_POSITION_CLASS_POSTROLL, () => "postrolls" as const)
      .with(sdk.TIME_POSITION_CLASS_PAUSE_MIDROLL, () => "pauseMidrolls" as const)
      .otherwise(() => "notSupported" as const);
