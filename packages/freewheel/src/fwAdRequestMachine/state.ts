import type { Logger } from "@hyoga-fp/core";
import * as IO from "fp-ts/IO";
import * as IORef from "fp-ts/IORef";
import type { Endomorphism } from "fp-ts/lib/Endomorphism";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as t from "io-ts";
import { match } from "ts-pattern";
import { FwAdSlot, type FwSdk } from "..";

export const setPhase =
  (phase: Phase) =>
  (state: State): State => ({ ...state, phase });

export const Init = t.type({ _tag: t.literal("Init") });
export const Preroll = t.type({ _tag: t.literal("Preroll") });
export const Content = t.type({ _tag: t.literal("Content") });
export const Midroll = t.type({ _tag: t.literal("Midroll") });
export const PauseMidroll = t.type({ _tag: t.literal("PauseMidroll") });
export const Postroll = t.type({ _tag: t.literal("Postroll") });
export const Done = t.type({ _tag: t.literal("Done") });

export const Phase = t.union([Init, Preroll, Content, Midroll, PauseMidroll, Postroll, Done]);
export type Phase = t.TypeOf<typeof Phase>;

// Guard utilities

// Runs "effect" only when the current phase tag is in "allowedTags", otherwise no-ops
export const whenPhaseIO =
  (getState: IO.IO<State>) =>
  (allowedTags: ReadonlyArray<Phase["_tag"]>) =>
  (effect: IO.IO<void>): IO.IO<void> =>
    pipe(
      getState,
      IO.flatMap((state) => (allowedTags.includes(state.phase._tag) ? effect : IO.of(undefined))),
    );

// Task variant of "whenPhase"
export const whenPhaseT =
  (getState: IO.IO<State>) =>
  (allowedTags: ReadonlyArray<Phase["_tag"]>) =>
  (effect: T.Task<void>): T.Task<void> =>
    pipe(
      T.fromIO(getState),
      T.flatMap((state) => (allowedTags.includes(state.phase._tag) ? effect : T.of(undefined))),
    );

// State

export interface State {
  readonly phase: Phase;

  readonly prerolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly midrolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly overlays: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly postrolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly pauseMidrolls: ReadonlyArray<FwAdSlot.AdSlot>;

  readonly contentSrc: string;
  readonly currentSlot: O.Option<FwAdSlot.AdSlot>; // the ad slot currently playing
  readonly contentPausedOn: number; // resume position for mid/pause-midroll
}

export const createInitialState = (contentSrc: string): State => ({
  // Machine
  phase: { _tag: "Init" },

  // Slots
  prerolls: [],
  midrolls: [],
  overlays: [],
  postrolls: [],
  pauseMidrolls: [],

  // Playing AD
  currentSlot: O.none,

  // Content
  contentSrc,

  // Context

  // Prima di riprodurre un AD salviamo la posizione di riproduzione del contenuto prima di cambiare sorgente
  // così al termine riprendiamo al punto corretto
  contentPausedOn: 0,
});

// Usata per determinare in quale parte dello stato va inserito lo slot
export const getStateSlotForSlotClassId =
  (sdk: FwSdk.SDK) =>
  (classId: string): keyof State | "notSupported" =>
    match(classId)
      .with(sdk.TIME_POSITION_CLASS_PREROLL, () => "prerolls" as const)
      .with(sdk.TIME_POSITION_CLASS_MIDROLL, () => "midrolls" as const)
      .with(sdk.TIME_POSITION_CLASS_OVERLAY, () => "overlays" as const)
      .with(sdk.TIME_POSITION_CLASS_POSTROLL, () => "postrolls" as const)
      .with(sdk.TIME_POSITION_CLASS_PAUSE_MIDROLL, () => "pauseMidrolls" as const)
      .otherwise(() => "notSupported" as const);

interface IMachineStateController {
  readonly setState: (f: Endomorphism<State>) => IO.IO<void>;
  readonly getState: IO.IO<State>;
}

export class Stateful implements IMachineStateController {
  constructor(
    private readonly logger: Logger,
    private readonly state: State,
    private readonly emitStateChange: (state: State) => void,
  ) {}

  stateRef = IORef.newIORef<State>(this.state)();

  private logStateSlots = (state: State) =>
    FwAdSlot.showAll(
      FwAdSlot.sortByTimePosition(
        [state.prerolls, state.midrolls, state.overlays, state.postrolls, state.pauseMidrolls].flat(),
      ),
    );

  public readonly setState = (f: Endomorphism<State>): IO.IO<void> =>
    pipe(
      this.stateRef.read,
      IO.tap((state) => this.logger.debug(`[Stateful] setState: CURRENT -> "${state.phase._tag}"`, state)),
      IO.flatMap(() => this.stateRef.modify(f)),
      IO.flatMap(() => this.stateRef.read),
      IO.tap((newState) => this.logger.debug(`[Stateful] setState: NEXT -> "${newState.phase._tag}"`, newState)),
      IO.tap((slots) => this.logger.debug(`[Stateful] slots: ${this.logStateSlots(slots)}`)),
      IO.tap((newState) => () => this.emitStateChange(newState)),
    );

  public readonly getState: IO.IO<State> = this.stateRef.read;
}

// FIUXME Utilities

export const hasSlots = (state: State) =>
  [
    state.overlays.length,
    state.midrolls.length,
    state.prerolls.length,
    state.postrolls.length,
    state.pauseMidrolls.length,
  ].reduce((prev, current) => prev + current, 0) === 0;

export const getFirstPlayableOverlay = (state: State) => (time: number) =>
  pipe(state.overlays, RA.findFirst(FwAdSlot.canPlayAt(time)));

export const getFirstPlayableMidroll = (state: State) => (time: number) =>
  pipe(state.midrolls, RA.findFirst(FwAdSlot.canPlayAt(time)));
