import type * as IO from "fp-ts/IO";
import type { FwADContext, FwSDK } from "..";

// -------------------------------------------------------------------------------------
// Models
// -------------------------------------------------------------------------------------

export interface AdManager {
  setNetwork(networkId: number): void;
  setServer(url: string): void;
  newContext(): FwADContext.AdContext;
}

// -------------------------------------------------------------------------------------
// Constructors
// -------------------------------------------------------------------------------------

export const create = (SDK: FwSDK.SDK): AdManager => new SDK.AdManager();

// -------------------------------------------------------------------------------------
// Combinators
// -------------------------------------------------------------------------------------

export const configure =
  (networkId: number, serverURL: string) =>
  (adManager: AdManager): IO.IO<FwADContext.AdContext> =>
  () => {
    adManager.setNetwork(networkId);
    adManager.setServer(serverURL);
    return adManager.newContext();
  };

export const createAndConfigure =
  (SDK: FwSDK.SDK) =>
  (networkId: number, serverURL: string): IO.IO<FwADContext.AdContext> =>
    configure(networkId, serverURL)(create(SDK));
