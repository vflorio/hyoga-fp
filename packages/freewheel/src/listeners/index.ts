import type * as IO from "fp-ts/IO";
import { withAdLifecycle } from "./ad-lifecycle";
import { withContentState } from "./content-state";
import { withInfrastructure } from "./infrastructure";
import { withPlaybackHealth } from "./playback-health";
import { withSlotLifecycle } from "./slot-lifecycle";
import type { DiagnosticDeps } from "./types";
import { withUserInteractions } from "./user-interactions";

export type { CoreHandlers } from "./core-handlers";
export { registerCoreHandlers, removeCoreHandlers } from "./core-handlers";

export interface DiagnosticRegistration {
  readonly register: IO.IO<void>;
  readonly remove: IO.IO<void>;
}

export const createDiagnostics = (deps: DiagnosticDeps): DiagnosticRegistration => {
  const categories = [
    withAdLifecycle(deps),
    withUserInteractions(deps),
    withPlaybackHealth(deps),
    withSlotLifecycle(deps),
    withContentState(deps),
    withInfrastructure(deps),
  ];

  return {
    register: () => categories.forEach((cat) => cat.register()),
    remove: () => categories.forEach((cat) => cat.remove()),
  };
};
