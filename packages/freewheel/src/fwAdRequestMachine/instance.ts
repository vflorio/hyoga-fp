import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import { match } from "ts-pattern";
import { FwAdRequest, type FwAdSlot } from "..";
import { createDiagnostics } from "../diagnostics/diagnostics";
import type { FwAdRequestMachine, FwAdRequestMachineDeps } from ".";
import * as Phase from "./phases";
import { createInitialState, type MachineState, Stateful, setPhase, whenPhaseIO } from "./state";

// Transition | SetPhase -> StateChange -> InstancePhaseEffect<T>

// Questa funzione gestisce ogni possibile fase della state-machine, se si aggiunge una nuova Phase, da qui si connette all'instanza
const instancePhaseEffect = (state: MachineState) => (instance: FwAdRequestMachineInstance) =>
  pipe(
    IO.of(state),
    IO.tap(() => instance.deps.logger.debug(`[MachineInstance] Effect start ${state.phase._tag}`)),
    IO.flatMap(() =>
      match(state.phase)
        .with({ _tag: "Init" }, () => Phase.onInit(state, instance))
        .with({ _tag: "Preroll" }, () => Phase.onPreroll(state, instance))
        .with({ _tag: "Content" }, () => Phase.onContent(state, instance))
        .with({ _tag: "Midroll" }, () => Phase.onMidroll(state, instance))
        .with({ _tag: "PauseMidroll" }, () => Phase.onPauseMidroll(state, instance))
        .with({ _tag: "Postroll" }, () => Phase.onPostroll(state, instance))
        .with({ _tag: "Done" }, () => Phase.onDone(state, instance))
        .exhaustive(),
    ),
    IO.tap((newState) => instance.deps.logger.debug(`[MachineInstance] Effect end ${newState.phase._tag}`)),
  );

export class FwAdRequestMachineInstance implements FwAdRequestMachine {
  state: MachineState = createInitialState(this.deps.videoAdapter.getSrc());

  stateful = new Stateful(
    // Dipendenze
    this.deps.logger,
    this.state,
    // Quando lo stato cambia, eseguiamo i side-effect della nuova fase
    (state) => instancePhaseEffect(state)(this)(),
  );

  diagnostics = createDiagnostics(this.deps);

  constructor(readonly deps: FwAdRequestMachineDeps) {}

  // Private API

  private readonly setupAdContext: IO.IO<void> = pipe(
    this.deps.logger.info("[MachineInstance] configureAdContext: configuring AD context"),
    IO.flatMap(() => FwAdRequest.setupTechnicalDefaults(this.deps)),
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
  public readonly earlyDispose: IO.IO<void> = whenPhaseIO(this.stateful.getState)([
    "Content",
    "Preroll",
    "Midroll",
    "PauseMidroll",
    "Postroll",
  ])(
    pipe(
      this.deps.logger.info("[MachineInstance] dispose: cleaning up"),
      IO.flatMap(() => this.stateful.setState(setPhase({ _tag: "Done" }))),
    ),
  );

  // API di sincronizzazione con video esterno
  public readonly pause: IO.IO<void> = pipe(IO.of(undefined));
  public readonly resume: IO.IO<void> = pipe(IO.of(undefined));

  // Debug Utils
  public readonly getState: IO.IO<MachineState> = this.stateful.getState;
  public declare readonly onStateChange: (callback: (state: MachineState) => void) => IO.IO<void>; //TODO
}
