import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import type { Model } from "../freeWheel";
import type { DiagnosticDeps, DiagnosticsDomainHandler } from "./diagnostics";

export type { DiagnosticsDomainHandler };

// Il Dispatch funziona da wrapper all'emit delle dipendenze
// effettua:
// 1. parsing dell'evento raw in un ADT
// 2. logga l'evento
// 3. lo trasmette attraverso la funzione emit delle dipendenze
// Viene utilizzato solo all'interno dei DiagnosticsDomainHandler per gestire la callback di un evento dell'SDK
// TODO: fare una funzione di parsing esplicita con Either
export const dispatch = (
  deps: DiagnosticDeps,
  eventName: string,
  fromRawEvent: (raw: any) => Model.SDKEvent | null,
) => {
  const { emit, logger } = deps;

  return (raw: any): void =>
    pipe(
      O.fromNullable(fromRawEvent(raw)),
      O.match(
        () =>
          pipe(
            logger.warn(`[dispatch] ValidationError on ${eventName}`, raw),
            IO.flatMap(
              () => () =>
                emit({
                  _tag: "ValidationError",
                  eventName,
                  rawPayload: raw,
                  reason: "Unexpected payload shape",
                }),
            ),
          ),
        (event) =>
          pipe(
            logger.debug(`[dispatch] ${event._tag}`, event),
            IO.flatMap(() => () => emit(event)),
          ),
      ),
    )();
};

export const extractAdId = (event: any): string => event?.adInstance?.getAdId?.() ?? event?.adId ?? "unknown";
