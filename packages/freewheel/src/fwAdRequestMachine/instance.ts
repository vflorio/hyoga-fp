import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import type { FwAdRequestMachine, FwAdRequestMachineDeps } from ".";
import { createInitialState, type MachinePhase, type MachineState } from "./state";

export class FwAdRequestMachineInstance implements Partial<FwAdRequestMachine> {
  phase: MachinePhase = { _tag: "Init" };
  state: MachineState = createInitialState(this.deps.videoAdapter.getSrc());

  constructor(private readonly deps: FwAdRequestMachineDeps) {}

  public readonly requestAds: T.Task<void> = pipe(T.of(undefined));

  // Questa viene usata in caso si voglia eseguire una nuova richiesta AD prima di aver terminato gli slots
  // e/o remount react e simili
  public readonly earlyDispose: IO.IO<void> = pipe(IO.of(undefined));

  // API di sincronizzazione con video esterno,
  public readonly pause: IO.IO<void> = pipe(IO.of(undefined));
  public readonly resume: IO.IO<void> = pipe(IO.of(undefined));

  // Debug Utils
  public readonly getPhase: IO.IO<MachinePhase> = pipe(IO.of(this.phase));
  public readonly getState: IO.IO<MachineState> = pipe(IO.of(this.state));

  public declare readonly onPhaseChange: (callback: (phase: MachinePhase) => void) => IO.IO<void>; //TODO
  public declare readonly onStateChange: (callback: (state: MachineState) => void) => IO.IO<void>; //TODO
}
