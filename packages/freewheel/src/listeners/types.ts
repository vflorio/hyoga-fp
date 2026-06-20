import type { Logger } from "@hyoga-fp/core";
import type * as FreeWheel from "../freeWheel";
import type * as Model from "../model";

export interface DiagnosticDeps {
  readonly adContext: FreeWheel.AdContext;
  readonly SDK: FreeWheel.SDK;
  readonly emit: (event: Model.SDK.SDKEvent) => void;
  readonly logger: Logger;
}

export type CategoryPair = { register: () => void; remove: () => void };
