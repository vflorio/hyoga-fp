import type { Logger } from "@hyoga-fp/core";
import * as IO from "fp-ts/IO";
import * as IORef from "fp-ts/IORef";
import type { Endomorphism } from "fp-ts/lib/Endomorphism";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { match } from "ts-pattern";
import { FwAdSlot, type FwSdk } from "..";

// Phase

export type MachinePhase =
  | { readonly _tag: "Init" } // player created, no request submitted yet
  | { readonly _tag: "Preroll" } // preroll slot is playing
  | { readonly _tag: "Content" } // content video is playing (or paused waiting resume)
  | { readonly _tag: "Midroll" } // content paused, midroll slot playing
  | { readonly _tag: "PauseMidroll" } // user paused, pause-midroll slot playing
  | { readonly _tag: "Postroll" } // postroll slot is playing
  | { readonly _tag: "Done" }; // all done, context disposed

export const setPhase =
  (phase: MachinePhase) =>
  (state: MachineState): MachineState => ({ ...state, phase });

// State

export interface MachineState {
  readonly phase: MachinePhase;

  readonly prerolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly midrolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly overlays: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly postrolls: ReadonlyArray<FwAdSlot.AdSlot>;
  readonly pauseMidrolls: ReadonlyArray<FwAdSlot.AdSlot>;

  readonly contentSrc: string;
  readonly currentSlot: O.Option<FwAdSlot.AdSlot>; // the ad slot currently playing
  readonly contentPausedOn: number; // resume position for mid/pause-midroll
}

export const createInitialState = (contentSrc: string): MachineState => ({
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
  (classId: string): keyof MachineState | "notSupported" =>
    match(classId)
      .with(sdk.TIME_POSITION_CLASS_PREROLL, () => "prerolls" as const)
      .with(sdk.TIME_POSITION_CLASS_MIDROLL, () => "midrolls" as const)
      .with(sdk.TIME_POSITION_CLASS_OVERLAY, () => "overlays" as const)
      .with(sdk.TIME_POSITION_CLASS_POSTROLL, () => "postrolls" as const)
      .with(sdk.TIME_POSITION_CLASS_PAUSE_MIDROLL, () => "pauseMidrolls" as const)
      .otherwise(() => "notSupported" as const);

interface IMachineStateController {
  readonly setState: (f: Endomorphism<MachineState>) => IO.IO<void>;
  readonly getState: IO.IO<MachineState>;
}

export class Stateful implements IMachineStateController {
  constructor(
    private readonly logger: Logger,
    private readonly state: MachineState,
  ) {}

  stateRef = IORef.newIORef<MachineState>(this.state)();

  private logStateSlots = (state: MachineState) =>
    FwAdSlot.showAll(
      FwAdSlot.sortByTimePosition([
        ...state.prerolls,
        ...state.midrolls,
        ...state.overlays,
        ...state.postrolls,
        ...state.pauseMidrolls,
      ]),
    );

  public readonly setState = (f: Endomorphism<MachineState>): IO.IO<void> =>
    pipe(
      this.stateRef.read,
      IO.tap((state) => this.logger.debug(`[Stateful] setState: CURRENT -> "${state.phase._tag}"`, state)),
      IO.flatMap(() => this.stateRef.modify(f)),
      IO.flatMap(() => this.stateRef.read),
      IO.tap((newState) => this.logger.debug(`[Stateful] setState: NEXT -> "${newState.phase._tag}"`, newState)),
      IO.tap((slots) => this.logger.debug(`[Stateful] slots: ${this.logStateSlots(slots)}`)),
      //IO.flatMap((newState) => () => emitStateChange(newState)),
    );

  public readonly getState: IO.IO<MachineState> = this.stateRef.read;
}
