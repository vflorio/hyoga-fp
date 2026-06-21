import type * as IO from "fp-ts/IO";
import * as IORef from "fp-ts/IORef";
import * as Listeners from "../listeners";
import * as Model from "../model";
import { createAdBreakOps } from "./ops/adBreaks";
import { createControlOps } from "./ops/controls";
import { createPlaybackOps } from "./ops/playback";
import { createRequestOps } from "./ops/request";
import type { Player, PlayerDeps, PlayerOpContext } from "./types";

export const createPlayer = (deps: PlayerDeps): Player => {
  const { logger, adContext, video, SDK, emit } = deps;

  const diagnostics = Listeners.createDiagnostics({ logger, adContext, SDK, emit });
  const videoSrc = video.getSrc();
  const stateRef = IORef.newIORef<Model.Player.PlayerState>(Model.Player.createInitialState(videoSrc))();

  const context: PlayerOpContext = { ...deps, stateRef, diagnostics };

  // Lazy references to avoid circular dependencies
  let playPostrollRef: IO.IO<void> = () => {};
  let removeCoreHandlersRef: IO.IO<void> = () => {};

  const playback = createPlaybackOps(context, () => playPostrollRef);
  const adBreaks = createAdBreakOps(context, playback, () => removeCoreHandlersRef);
  const controls = createControlOps(context, playback.removeVideoListeners);

  const coreHandlers: Listeners.CoreHandlers = {
    onSlotStarted: adBreaks.onSlotStarted,
    onSlotEnded: adBreaks.onSlotEnded,
    onContentPauseRequest: adBreaks.onContentPauseRequest,
    onContentResumeRequest: adBreaks.onContentResumeRequest,
  };

  const { requestAds } = createRequestOps(context, coreHandlers, adBreaks.playPreroll);

  playPostrollRef = adBreaks.playPostroll;
  removeCoreHandlersRef = Listeners.removeCoreHandlers(adContext, SDK, coreHandlers);

  return { requestAds, pause: controls.pause, resume: controls.resume };
};
