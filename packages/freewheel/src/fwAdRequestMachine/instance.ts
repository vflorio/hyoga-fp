import * as IO from "fp-ts/IO";
import { constVoid, pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import { FwAdRequest, type FwAdSlot } from "..";
import { createDiagnostics } from "../diagnostics/diagnostics";
import type { FwAdRequestMachine, FwAdRequestMachineDeps } from ".";
import * as ContentController from "./controllers/content";
import * as SlotController from "./controllers/slot";
import * as Effects from "./effects";
import type * as MediaEvents from "./events";
import * as Phase from "./phases";
import { createInitialState, type MachineState, Stateful, setPhase, whenPhaseIO } from "./state";

export class FwAdRequestMachineInstance implements FwAdRequestMachine {
  state: MachineState = createInitialState(this.deps.getVideoAdapter().getSrc());

  onSlotEndedEffects = {
    onPreroll: Effects.playPreroll(this.deps),
    onPostroll: Effects.playPostroll(this.deps),
    onMidroll: Effects.restoreAfterMidroll(this.deps),
    onPauseMidroll: Effects.restoreAfterPauseMidroll(this.deps),
    onOverlay: constVoid, // overlay non richiede azioni particolari, il contenuto continua a girare sotto
  };

  // Questi rimangono registrati dalla fase di "Init" fino alla "Done"
  mediaEventListeners: MediaEvents.CoreHandlers = {
    // Content
    onContentPauseRequest: ContentController.onContentPauseRequest(this.deps)(this),
    onContentResumeRequest: ContentController.onContentResumeRequest(this.deps)(this),
    // Slot
    onSlotStarted: SlotController.onSlotStarted(this.deps),
    onSlotEnded: SlotController.onSlotEnded(this.deps)(this.onSlotEndedEffects),
  };

  stateful = new Stateful(
    // Dipendenze
    this.deps.logger,
    this.state,
    // Quando lo stato cambia, eseguiamo i side-effect della nuova fase
    (state) => Phase.runInstancePhaseEffect(state)(this)(),
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
    T.Do,
    T.tapIO(() => this.deps.logger.info("[MachineInstance] requestAds: submitting AD request")),
    T.flatMap(() => T.fromIO(this.setupAdContext)),
    T.flatMap(() => FwAdRequest.submit(this.deps)),
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
