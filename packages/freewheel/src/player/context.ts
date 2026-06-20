import type { Logger } from "@hyoga-fp/core";
import type { IO, IORef } from "..";
import type * as Listeners from "../listeners";
import type * as Model from "../model";
import type * as FreeWheel from "../model/freewheel";
import type { VideoPlayer } from "./types";

export interface PlayerContext {
  readonly stateRef: IORef.IORef<Model.Player.PlayerState>;
  readonly video: VideoPlayer;
  readonly adContext: FreeWheel.AdContext;
  readonly SDK: FreeWheel.SDK;
  readonly logger: Logger;
  readonly emit: (event: Model.SDK.SDKEvent) => void;
  readonly diagnostics: Listeners.DiagnosticRegistration;
  readonly configureContext: IO.IO<void>;
}
