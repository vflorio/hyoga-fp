import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import type { Model } from "../freeWheel";
import type { DiagnosticDeps } from "./diagnostics";

export type CategoryPair = { register: () => void; remove: () => void };

// Il Dispatch applica la funzione di trasformazione da evento raw a evento ADT
// logga e lo trasmette attraverso la funzione emit delle dipendenze
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
            logger.warn(`[SDK] ValidationError on ${eventName}`, raw),
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
            logger.debug(`[SDK] ${event._tag}`, event),
            IO.flatMap(() => () => emit(event)),
          ),
      ),
    )();
};

export const extractAdId = (event: any): string => event?.adInstance?.getAdId?.() ?? event?.adId ?? "unknown";
