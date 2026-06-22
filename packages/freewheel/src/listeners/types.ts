import type { Logger } from "@hyoga-fp/core";
import type { FreeWheel, Model } from "..";

export interface DiagnosticDeps {
  readonly adContext: FreeWheel.AdContext;
  readonly SDK: FreeWheel.SDK;
  readonly emit: (event: Model.SDKEvent) => void;
  readonly logger: Logger;
}

export type CategoryPair = { register: () => void; remove: () => void };
