import type * as T from "fp-ts/Task";
import type { FwAdContext, FwAdSlot, FwSdk } from "..";

export * as Setup from "./setup";

export interface AdRequestDeps {
  readonly SDK: FwSdk.SDK;
  readonly adContext: FwAdContext.AdContext;
}

export const submit =
  (deps: AdRequestDeps): T.Task<ReadonlyArray<FwAdSlot.AdSlot>> =>
  () =>
    new Promise((resolve) => {
      const handler = (event: { success: boolean }) => {
        deps.adContext.removeEventListener(deps.SDK.EVENT_REQUEST_COMPLETE, handler);
        resolve(event.success ? deps.adContext.getTemporalSlots() : []);
      };

      deps.adContext.addEventListener(deps.SDK.EVENT_REQUEST_COMPLETE, handler);
      deps.adContext.submitRequest();
    });
