import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import { match } from "ts-pattern";
import { createDiagnostics } from "../diagnostics/diagnostics";
import type { FwAdRequestMachine, FwAdRequestMachineDeps } from ".";
import { createInitialState, type MachinePhase, type MachineState, Stateful, setPhase } from "./state";

export class FwAdRequestMachineInstance implements Partial<FwAdRequestMachine> {
  phase: MachinePhase = { _tag: "Init" };
  state: MachineState = createInitialState(this.deps.videoAdapter.getSrc());

  stateful = new Stateful(this.deps.logger, this.state);

  diagnostics = createDiagnostics(this.deps);

  constructor(readonly deps: FwAdRequestMachineDeps) {}

  // Private API

  // Public API

  public readonly requestAds: T.Task<void> = pipe(T.of(undefined));

  // Questa viene usata in caso si voglia eseguire una nuova richiesta AD prima di aver terminato gli slots
  // e/o remount react e simili
  public readonly earlyDispose: IO.IO<void> = pipe(
    this.deps.logger.info("[MachineInstance] dispose: cleaning up"),
    IO.flatMap(() => this.stateful.setState(setPhase({ _tag: "Done" }))),
  );

  // API di sincronizzazione con video esterno,
  public readonly pause: IO.IO<void> = pipe(IO.of(undefined));
  public readonly resume: IO.IO<void> = pipe(IO.of(undefined));

  // Debug Utils
  public readonly getPhase: IO.IO<MachinePhase> = pipe(IO.of(this.phase));
  public readonly getState: IO.IO<MachineState> = this.stateful.getState;

  public declare readonly onPhaseChange: (callback: (phase: MachinePhase) => void) => IO.IO<void>; //TODO
  public declare readonly onStateChange: (callback: (state: MachineState) => void) => IO.IO<void>; //TODO
}

// Ad ogni cambio di stato, rieseguiamo la nuova logica associata
export const matchPhase = (
  phase: MachinePhase,
  state: MachineState,
  instance: FwAdRequestMachineInstance,
): IO.IO<MachineState> =>
  match(phase)
    .with({ _tag: "Init" }, () => onInitPhase(state, instance))
    .with({ _tag: "Preroll" }, () => onPrerollPhase(state, instance))
    .with({ _tag: "Content" }, () => onContentPhase(state, instance))
    .with({ _tag: "Midroll" }, () => onMidrollPhase(state, instance))
    .with({ _tag: "PauseMidroll" }, () => onPauseMidrollPhase(state, instance))
    .with({ _tag: "Postroll" }, () => onPostrollPhase(state, instance))
    .with({ _tag: "Done" }, () => onDonePhase(state, instance))
    .exhaustive();

const onInitPhase = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

const onPrerollPhase = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

const onContentPhase = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

const onMidrollPhase = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

const onPauseMidrollPhase = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

const onPostrollPhase = (state: MachineState, _instance: FwAdRequestMachineInstance) => pipe(IO.of(state));

const onDonePhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(
    IO.of(state),
    IO.tap(() => instance.diagnostics.remove),
    IO.tap(() => () => instance.deps.adContext.dispose()),
  );
