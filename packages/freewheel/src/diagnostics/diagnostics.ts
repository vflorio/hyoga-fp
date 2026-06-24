import type { Logger } from "@hyoga-fp/core";
import type * as IO from "fp-ts/IO";
import type { FwAdContext, FwSdk } from "..";
import { withAdLifecycle } from "./domains/adLifecycle";
import { withContentState } from "./domains/contentState";
import { withInfrastructure } from "./domains/infrastructure";
import { withPlaybackHealth } from "./domains/playbackHealth";
import { withSlotLifecycle } from "./domains/slotLifecycle";
import { withUserInteractions } from "./domains/userInteractions";

// Il modulo Diagnostics registra event listeners per tutte le categorie di
// eventi SDK e li colleziona allo scopo di catalogazione e tracking

export interface DiagnosticRegistration {
  readonly register: IO.IO<void>;
  readonly remove: IO.IO<void>;
}

export interface DiagnosticDeps {
  readonly adContext: FwAdContext.AdContext;
  readonly SDK: FwSdk.SDK;
  readonly emit: (event: FwSdk.Event) => void;
  readonly logger: Logger;
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
    register: () => categories.forEach((category) => category.register()),
    remove: () => categories.forEach((category) => category.remove()),
  };
};

export type DiagnosticsDomainHandler = { register: () => void; remove: () => void };
