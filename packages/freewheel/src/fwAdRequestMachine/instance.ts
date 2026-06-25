import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import { FwAdRequest, type FwAdSlot } from "..";
import { createDiagnostics } from "../diagnostics/diagnostics";
import type { FwAdRequestMachine, FwAdRequestMachineDeps } from ".";
import * as Phase from "./phases";
import { createInitialState, type State, Stateful, setPhase, whenPhaseIO } from "./state";
import * as Transitions from "./transitions";

export class Instance implements FwAdRequestMachine {
  state: State = createInitialState(this.deps.getVideoAdapter().getSrc());

  stateful = new Stateful(
    // Dipendenze
    this.deps.logger,
    this.state,
    // Quando lo stato cambia, eseguiamo i side-effect della nuova fase
    (state) => Phase.runInstancePhaseEffect(state)(this)(),
  );

  diagnostics = createDiagnostics(this.deps);

  constructor(readonly deps: FwAdRequestMachineDeps) {
    deps.logger.info(`[MachineInstance] created, FreeWheel SDK version ${deps.SDK.version}`)();
  }

  // Public API

  public readonly requestAds: T.Task<ReadonlyArray<FwAdSlot.AdSlot>> = pipe(
    T.Do,
    T.tapIO(() => this.deps.logger.info("[MachineInstance] requestAds: submitting AD request")),
    T.flatMap(() =>
      T.fromIO(
        pipe(
          this.deps.logger.info("[MachineInstance] requestAds: configuring AD context"),
          IO.flatMap(() => FwAdRequest.setupTechnicalDefaults(this.deps)),
          IO.flatMap(() => this.deps.setupBusinessAdContext),
        ),
      ),
    ),
    T.flatMap(() => FwAdRequest.submit(this.deps)),
    T.tapIO((slots) => this.stateful.setState(Transitions.applySlots(this.deps.SDK)(slots))),
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
  public readonly getState: IO.IO<State> = this.stateful.getState;
  public declare readonly onStateChange: (callback: (state: State) => void) => IO.IO<void>; //TODO
}
