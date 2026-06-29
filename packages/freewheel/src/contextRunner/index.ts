import type { Logger } from "@hyoga-fp/core";
import type * as IO from "fp-ts/IO";
import type { Endomorphism } from "fp-ts/lib/Endomorphism";
import type * as T from "fp-ts/Task";
import type { FreeWheel, Model } from "../freeWheel";
import type { PlayerState } from "./state";

export { createContextRunner } from "./contextRunner";
export * from "./state";

export interface ContextRunnerVideoAdapter {
  readonly play: IO.IO<void>;
  readonly pause: IO.IO<void>;
  readonly getCurrentTime: IO.IO<number>;
  readonly seek: (src: string, at: number) => IO.IO<void>;
  readonly enableControls: IO.IO<void>;
  readonly getSrc: IO.IO<string>;
  readonly on: (event: "timeupdate" | "ended", handler: () => void) => IO.IO<void>;
  readonly off: (event: "timeupdate" | "ended", handler: () => void) => IO.IO<void>;
}

export interface ContextRunnerDeps {
  readonly logger: Logger;
  readonly SDK: FreeWheel.SDK;
  readonly adContext: FreeWheel.AdContext;
  readonly videoAdapter: ContextRunnerVideoAdapter;
  readonly setupBusinessAdContext: IO.IO<void>;
  readonly emit: (event: Model.SDKEvent) => void;
  readonly emitStateChange: (state: PlayerState) => void;
  readonly emitAdsData: (triggers: {
    preroll: number[];
    midroll: number[];
    overlay: number[];
    postroll: number[];
    pauseMidroll: number[];
  }) => void;
}

export interface ContextRunner {
  readonly requestAds: T.Task<void>;
  readonly pause: IO.IO<void>;
  readonly resume: IO.IO<void>;
  readonly dispose: IO.IO<void>;
}

export interface ContextRunnerOpContext extends ContextRunnerDeps {
  readonly setState: (f: Endomorphism<PlayerState>) => IO.IO<void>;
  readonly getState: IO.IO<PlayerState>;
}
