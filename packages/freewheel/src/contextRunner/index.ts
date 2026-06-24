import type { Logger } from "@hyoga-fp/core";
import type * as IO from "fp-ts/IO";
import type { Endomorphism } from "fp-ts/lib/Endomorphism";
import type * as T from "fp-ts/Task";
import type { FwAdContext, FwSdk } from "..";
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
  readonly SDK: FwSdk.SDK;
  readonly adContext: FwAdContext.AdContext;
  readonly videoAdapter: ContextRunnerVideoAdapter;
  readonly setupBusinessAdContext: IO.IO<void>;
  readonly emit: (event: FwSdk.Event) => void;
  readonly emitStateChange: (state: PlayerState) => void;
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
