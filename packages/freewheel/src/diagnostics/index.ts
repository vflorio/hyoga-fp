import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import type { FwSdk } from "..";
import type { DiagnosticDeps, DiagnosticsDomainHandler } from "./diagnostics";

export type { DiagnosticsDomainHandler };

// Il Dispatch funziona da wrapper all'emit delle dipendenze
// effettua:
// 1. parsing dell'evento raw in un ADT
// 2. logga l'evento
// 3. lo trasmette attraverso la funzione emit delle dipendenze
// Viene utilizzato solo all'interno dei DiagnosticsDomainHandler per gestire la callback di un evento dell'SDK
// TODO: fare una funzione di parsing esplicita con Either
export const dispatchSdkEvent =
  (deps: DiagnosticDeps, eventName: string, parseSdkEventFrom: (raw: unknown) => FwSdk.Event | null) =>
  (raw: unknown): void =>
    pipe(
      O.fromNullable(parseSdkEventFrom(raw)),
      O.match(
        () =>
          pipe(
            deps.logger.warn(`[dispatch] ValidationError on ${eventName}`, raw),
            IO.flatMap(
              () => () =>
                deps.emit({
                  // FIXME cambiare dominio evento
                  _tag: "FreeWheel/ValidationError",
                  eventName,
                  rawPayload: raw,
                  reason: "Unexpected payload shape",
                }),
            ),
          ),
        (event) =>
          pipe(
            deps.logger.debug(`[dispatch] ${event._tag}`, event),
            IO.flatMap(() => () => deps.emit(event)),
          ),
      ),
    )();

export const extractAdId = (event: unknown): string =>
  (event as any)?.adInstance?.getAdId?.() ?? (event as any)?.adId ?? "unknown";
