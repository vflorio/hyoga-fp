import type { Logger } from "@hyoga-fp/core";
import type { IO } from "..";
import type * as Model from "../model";
import type * as FreeWheel from "../model/freewheel";

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
  readonly configureContext: IO.IO<void>;
  readonly emit: (event: Model.SDK.SDKEvent) => void;
}

export interface Player {
  readonly requestAds: import("fp-ts/Task").Task<void>;
  readonly pause: IO.IO<void>;
  readonly resume: IO.IO<void>;
}
