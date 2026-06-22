import type { Logger } from "@hyoga-fp/core";
import type * as IO from "fp-ts/IO";
import type * as IORef from "fp-ts/lib/IORef";
import type * as T from "fp-ts/Task";
import type { FreeWheel, Model } from "../freeWheel";
import type { PlayerState } from "./state";

export interface VideoPlayer {
  readonly play: IO.IO<void>;
  readonly pause: IO.IO<void>;
  readonly getCurrentTime: IO.IO<number>;
  readonly seek: (src: string, at: number) => IO.IO<void>;
  readonly enableControls: IO.IO<void>;
  readonly getSrc: IO.IO<string>;
  readonly on: (event: "timeupdate" | "ended", handler: () => void) => IO.IO<void>;
  readonly off: (event: "timeupdate" | "ended", handler: () => void) => IO.IO<void>;
}

export interface PlayerDeps {
  readonly logger: Logger;
  readonly SDK: FreeWheel.SDK;
  readonly adContext: FreeWheel.AdContext;
  readonly video: VideoPlayer;
  readonly setupBusinessAdContext: IO.IO<void>;
  readonly emit: (event: Model.SDKEvent) => void;
}

export interface Player {
  readonly requestAds: T.Task<void>;
  readonly pause: IO.IO<void>;
  readonly resume: IO.IO<void>;
  readonly dispose: IO.IO<void>;
}

export interface PlayerOpContext extends PlayerDeps {
  readonly stateRef: IORef.IORef<PlayerState>;
}
