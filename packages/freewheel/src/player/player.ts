import * as IO from "fp-ts/IO";
import * as IORef from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as Listeners from "../listeners";
import * as Model from "../model";
import * as Transitions from "../player/transitions";
import { createAdBreakOps } from "./ops/adBreaks";
import { createControlOps } from "./ops/controls";
import { createPlaybackOps } from "./ops/playback";
import { createRequestOps } from "./ops/request";
import type { Player, PlayerDeps, PlayerOpContext } from "./types";

// Il Player è ra[]
export const createAdPlayer = (deps: PlayerDeps): Player => {
  const { logger, adContext, video, SDK, emit } = deps;

  const diagnostics = Listeners.createDiagnostics({ logger, adContext, SDK, emit });
  const videoSrc = video.getSrc();
  const stateRef = IORef.newIORef<Model.Player.PlayerState>(Model.Player.createInitialState(videoSrc))();

  const context: PlayerOpContext = { ...deps, stateRef };

  // Quando arriviamo a questo punto significa che abbiamo consumato tutti gli slots di postroll e
  // la state-machine è arrivata alla fine, quindi è necessario istanziarne una nuova
  // (con chiamata https annessa) per poter erogare un nuovo AD break
  const dispose: IO.IO<void> = pipe(
    logger.info("AdPlayer: disposing ad context, phase -> Done"),
    IO.flatMap(() => stateRef.modify(Transitions.setPhase({ _tag: "Done" }))),
    IO.flatMap(() => diagnostics.remove),
    IO.flatMap(() => Listeners.removeCoreHandlers(adContext, SDK, coreHandlers)),
    IO.flatMap(() => () => adContext.dispose()),
    IO.flatMap(() => logger.debug("AdPlayer: all listeners removed, context disposed")),
    IO.flatMap(() => () => emit({ _tag: "Complete" })),
  );

  // Lazy references to avoid circular dependencies
  let playPostrollRef: IO.IO<void> = () => {};

  const playback = createPlaybackOps(context, () => playPostrollRef);
  const adBreaks = createAdBreakOps(context, playback, dispose);
  const controls = createControlOps(context, playback.removeVideoListeners);

  playPostrollRef = adBreaks.playPostroll;

  // Questi sono gli event handlers necessari ad erogare correttamente un AD break, non vanno alterati
  const coreHandlers: Listeners.CoreHandlers = {
    onSlotStarted: adBreaks.onSlotStarted,
    onSlotEnded: adBreaks.onSlotEnded,
    onContentPauseRequest: adBreaks.onContentPauseRequest,
    onContentResumeRequest: adBreaks.onContentResumeRequest,
  };

  const requests = createRequestOps(context, coreHandlers, adBreaks.playPreroll);

  return {
    // Il flusso di runtime inizia facendo la richiesta all'ADServer, che ci restituirà gli slots da erogare
    requestAds: pipe(
      requests.requestAds,
      // Qui registriamo gli event listeners diagnostici per tracciare stato, errori, ed eventi SDK
      T.flatMap(() => T.fromIO(diagnostics.register)),
    ),
    pause: controls.pause,
    resume: controls.resume,
    dispose,
  };
};
