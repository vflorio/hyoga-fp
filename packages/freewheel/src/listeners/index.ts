import type * as IO from "fp-ts/IO";
import type * as Model from "../model";
import { withAdLifecycle } from "./ad-lifecycle";
import { withContentState } from "./content-state";
import { withInfrastructure } from "./infrastructure";
import { withPlaybackHealth } from "./playback-health";
import { withSlotLifecycle } from "./slot-lifecycle";
import type { DiagnosticDeps } from "./types";
import { withUserInteractions } from "./user-interactions";

export type { CoreHandlers } from "./core-handlers";
export { registerCoreHandlers, removeCoreHandlers } from "./core-handlers";

// Il modulo Diagnostics registra event listeners per tutte le categorie di
// eventi SDK e li colleziona allo scopo di catalogazione e tracking

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

// Il Dispatch applica la funzione di trasformazione da evento raw a evento ADT
// logga e lo trasmatte attraverso la funzione emit delle dipendenze
// TODO: trasformare in un IOEither (?)
export const dispatch = (
  deps: DiagnosticDeps,
  eventName: string,
  fromRawEvent: (raw: any) => Model.SDK.SDKEvent | null,
) => {
  const { emit, logger } = deps;

  return (raw: any): void => {
    const event = fromRawEvent(raw);

    if (!event) {
      const validationError: Model.SDK.SDKEvent = {
        _tag: "ValidationError",
        eventName,
        rawPayload: raw,
        reason: "Unexpected payload shape",
      };

      logger.warn(`[SDK] ValidationError on ${eventName}`, raw)();
      emit(validationError);

      return;
    }

    logger.debug(`[SDK] ${event._tag}`, event)();
    emit(event);
  };
};

export const extractAdId = (event: any): string => event?.adInstance?.getAdId?.() ?? event?.adId ?? "unknown";
