import * as IO from "fp-ts/IO";
import * as IORef from "fp-ts/IORef";
import type { Endomorphism } from "fp-ts/lib/Endomorphism";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import { createDiagnostics } from "../diagnostics/diagnostics";
import type { ContextRunner, ContextRunnerDeps, ContextRunnerOpContext } from ".";
import { type CoreHandlers, registerCoreHandlers, removeCoreHandlers } from "./coreHandlers";
import { createAdBreakOps } from "./ops/adBreaks";
import { createControlOps } from "./ops/controls";
import { createPlaybackOps } from "./ops/playback";
import { createRequestOps } from "./ops/request";
import { createInitialState, type PlayerState } from "./state";
import * as Transitions from "./transitions";

export const createContextRunner = (deps: ContextRunnerDeps): ContextRunner => {
  const { logger, adContext, videoAdapter, SDK, emit, emitStateChange } = deps;

  const diagnostics = createDiagnostics({ logger, adContext, SDK, emit });
  const videoSrc = videoAdapter.getSrc();

  const createStateManager = () => {
    const stateRef = IORef.newIORef<PlayerState>(createInitialState(videoSrc))();

    const setState = (reducer: Endomorphism<PlayerState>): IO.IO<void> =>
      pipe(
        stateRef.read,
        IO.tap((state) => logger.debug(`[ContextRunner] setState: CURRENT -> "${state.phase._tag}"`, state)),
        IO.flatMap(() => stateRef.modify(reducer)),
        IO.flatMap(() => stateRef.read),
        IO.tap((newState) => logger.debug(`[ContextRunner] setState: NEXT -> "${newState.phase._tag}"`, newState)),
        IO.flatMap((newState) => () => emitStateChange(newState)),
      );

    return { setState, getState: stateRef.read };
  };

  const { setState, getState } = createStateManager();

  const context: ContextRunnerOpContext = { ...deps, setState, getState };

  // Quando arriviamo a questo punto significa che abbiamo consumato tutti gli slots di postroll e
  // la state-machine è arrivata alla fine, quindi è necessario istanziarne una nuova
  // (con chiamata https annessa) per poter erogare un nuovo AD break
  // Chiamare dispose esplicitamente solo in casi speciali (es re-rendering react)
  const dispose: IO.IO<void> = pipe(
    logger.info("[ContextRunner] dispose: cleaning up"),
    IO.flatMap(() => setState(Transitions.setPhase({ _tag: "Done" }))),
    IO.flatMap(() => diagnostics.remove),
    IO.flatMap(() => removeCoreHandlers(adContext, SDK, coreHandlers)),
    IO.flatMap(() => () => adContext.dispose()),
    IO.flatMap(() => () => emit({ _tag: "Complete" })),
    // e2e tests
    IO.flatMap(() => () => window.dispatchEvent(new CustomEvent("onComplete"))),
  );

  const createOps = () => {
    // Lazy references to avoid circular dependencies
    let playPostrollRef: IO.IO<void> = () => {};

    const playback = createPlaybackOps(
      context,
      dispose,
      pipe(
        logger.debug("[ContextRunner] playPostrollRef: executing postroll effect"),
        IO.map(() => playPostrollRef),
      ),
    );
    const controls = createControlOps(context, playback);
    const adBreaks = createAdBreakOps(context, playback, dispose);
    const requests = createRequestOps(context, adBreaks.playPreroll);

    playPostrollRef = adBreaks.playPostroll;

    return { adBreaks, controls, requests };
  };

  const {
    controls: { pause, resume },
    adBreaks: { onSlotStarted, onSlotEnded, onContentPauseRequest, onContentResumeRequest },
    requests: { requestAds },
  } = createOps();

  // Questi sono gli event handlers necessari ad erogare correttamente un AD break, non vanno alterati
  const coreHandlers: CoreHandlers = { onSlotStarted, onSlotEnded, onContentPauseRequest, onContentResumeRequest };

  return {
    // Il flusso di runtime inizia facendo la richiesta all'ADServer, che ci restituirà gli slots da erogare
    requestAds: pipe(
      requestAds,
      // Abilitiamo il passaggio dati dall'AdContext al Runner
      T.flatMap(() => T.fromIO(registerCoreHandlers(adContext, SDK, coreHandlers))),
      // Qui registriamo gli event listeners diagnostici per tracciare stato, errori, ed eventi SDK
      T.flatMap(() => T.fromIO(diagnostics.register)),
    ),
    pause,
    resume,
    dispose,
  };
};
