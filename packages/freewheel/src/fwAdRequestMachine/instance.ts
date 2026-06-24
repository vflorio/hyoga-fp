import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import { match } from "ts-pattern";
import { FwAdRequest, type FwAdSlot } from "..";
import { createDiagnostics } from "../diagnostics/diagnostics";
import type { FwAdRequestMachine, FwAdRequestMachineDeps } from ".";
import { createInitialState, type MachinePhase, type MachineState, Stateful, setPhase } from "./state";

export class FwAdRequestMachineInstance implements FwAdRequestMachine {
  state: MachineState = createInitialState(this.deps.videoAdapter.getSrc());

  stateful = new Stateful(this.deps.logger, this.state);

  diagnostics = createDiagnostics(this.deps);

  constructor(readonly deps: FwAdRequestMachineDeps) {}

  // Private API

  private readonly setupAdContext: IO.IO<void> = pipe(
    this.deps.logger.info("[MachineInstance] configureAdContext: configuring AD context"),
    IO.flatMap(() => FwAdRequest.Setup.setupTechnicalDefaults(this.deps)),
    IO.flatMap(() => this.deps.setupBusinessAdContext),
  );

  // Public API

  public readonly requestAds: T.Task<ReadonlyArray<FwAdSlot.AdSlot>> = pipe(
    T.fromIO(this.setupAdContext),
    T.tapIO(() => this.deps.logger.info("[MachineInstance] requestAds: submitting AD request")),
    T.flatMap(() =>
      FwAdRequest.submit({
        adContext: this.deps.adContext,
        SDK: this.deps.SDK,
      }),
    ),
  );

  // Questa viene usata in caso si voglia eseguire una nuova richiesta AD prima di aver terminato gli slots
  // e/o remount react e simili
  public readonly earlyDispose: IO.IO<void> = pipe(
    this.deps.logger.info("[MachineInstance] dispose: cleaning up"),
    IO.flatMap(() => this.stateful.setState(setPhase({ _tag: "Done" }))),
  );

  // API di sincronizzazione con video esterno
  public readonly pause: IO.IO<void> = pipe(IO.of(undefined));
  public readonly resume: IO.IO<void> = pipe(IO.of(undefined));

  // Debug Utils
  public readonly getState: IO.IO<MachineState> = this.stateful.getState;
  public declare readonly onStateChange: (callback: (state: MachineState) => void) => IO.IO<void>; //TODO
}

// Questa funzione gestisce ogni possibile fase della state-machine, se si aggiunge una nuova Phase, da qui si connette l'interprete
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

const startPhase = (id: string) => (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(
    IO.of(state),
    IO.tap(() => instance.deps.logger.debug(`[MachineInstance] start on${id}Phase`)),
  );

const onInitPhase = (state: MachineState, instance: FwAdRequestMachineInstance) => startPhase("Init")(state, instance);

const onPrerollPhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(startPhase("Preroll")(state, instance));

const onContentPhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(startPhase("Content")(state, instance));

const onMidrollPhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(startPhase("Midroll")(state, instance));

const onPauseMidrollPhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(startPhase("PauseMidroll")(state, instance));

const onPostrollPhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(startPhase("Postroll")(state, instance));

const onDonePhase = (state: MachineState, instance: FwAdRequestMachineInstance) =>
  pipe(
    startPhase("Done")(state, instance),
    IO.tap(() => instance.diagnostics.remove),
    IO.tap(() => () => instance.deps.adContext.dispose()),
  );
