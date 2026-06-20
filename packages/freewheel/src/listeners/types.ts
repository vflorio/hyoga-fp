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

export const extractAdId = (event: any): string => event?.adInstance?.getAdId?.() ?? event?.adId ?? "unknown";

export const dispatch = (deps: DiagnosticDeps, eventName: string, build: (raw: any) => Model.SDK.SDKEvent | null) => {
  return (raw: any): void => {
    const event = build(raw);
    if (event) {
      deps.logger.debug(`[SDK] ${event._tag}`, event)();
      deps.emit(event);
    } else {
      const ve: Model.SDK.SDKEvent = {
        _tag: "ValidationError",
        eventName,
        rawPayload: raw,
        reason: "Unexpected payload shape",
      };
      deps.logger.warn(`[SDK] ValidationError on ${eventName}`, raw)();
      deps.emit(ve);
    }
  };
};
