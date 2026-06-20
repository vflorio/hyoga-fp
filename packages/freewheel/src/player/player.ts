import { type IO, IORef } from "..";
import * as Listeners from "../listeners";
import * as Model from "../model";
import { createAdBreakOps } from "./ad-breaks";
import type { PlayerContext } from "./context";
import { createControlOps } from "./controls";
import { createPlaybackOps } from "./playback";
import { createRequestOps } from "./request";
import type { Player, PlayerDeps } from "./types";

export const createPlayer = (deps: PlayerDeps): Player => {
  const { logger, adContext, video, SDK, configureContext, emit } = deps;

  const diagnostics = Listeners.createDiagnostics({ logger, adContext, SDK, emit });
  const videoSrc = video.getSrc();
  const stateRef = IORef.newIORef<Model.Player.PlayerState>(Model.Player.createInitialState(videoSrc))();

  const ctx: PlayerContext = { stateRef, video, adContext, SDK, logger, emit, diagnostics, configureContext };

  // Late-bind playPostroll to break the circular dependency:
  // playback → onContentEnded → playPostroll (from ad-breaks)
  let playPostrollRef: IO.IO<void> = () => {};

  const playback = createPlaybackOps(ctx, () => playPostrollRef);

  // Late-bind removeCoreHandlers to break: adBreaks.cleanUp → coreHandlers → adBreaks
  let removeCoreHandlersRef: IO.IO<void> = () => {};

  const adBreaks = createAdBreakOps(ctx, playback, () => removeCoreHandlersRef);
  playPostrollRef = adBreaks.playPostroll;

  const coreHandlers: Listeners.CoreHandlers = {
    onSlotStarted: adBreaks.onSlotStarted,
    onSlotEnded: adBreaks.onSlotEnded,
    onContentPauseRequest: adBreaks.onContentPauseRequest,
    onContentResumeRequest: adBreaks.onContentResumeRequest,
  };

  removeCoreHandlersRef = Listeners.removeCoreHandlers(adContext, SDK, coreHandlers);

  const controls = createControlOps(ctx, playback.removeVideoListeners);
  const { requestAds } = createRequestOps(ctx, coreHandlers, adBreaks.playPreroll);

  return { requestAds, pause: controls.pause, resume: controls.resume };
};
