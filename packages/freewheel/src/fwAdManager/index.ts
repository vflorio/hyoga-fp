import type * as IO from "fp-ts/IO";
import type { FwAdContext, FwSdk } from "..";

// -------------------------------------------------------------------------------------
// Models
// -------------------------------------------------------------------------------------

export interface AdManager {
  setNetwork(networkId: number): void;
  setServer(url: string): void;
  newContext(): FwAdContext.AdContext;
}

// -------------------------------------------------------------------------------------
// Constructors
// -------------------------------------------------------------------------------------

export const create = (SDK: FwSdk.SDK): AdManager => new SDK.AdManager();

// -------------------------------------------------------------------------------------
// Combinators
// -------------------------------------------------------------------------------------

export const configure =
  (networkId: number, serverURL: string) =>
  (adManager: AdManager): IO.IO<FwAdContext.AdContext> =>
  () => {
    adManager.setNetwork(networkId);
    adManager.setServer(serverURL);
    return adManager.newContext();
  };

export const createAndConfigure =
  (SDK: FwSdk.SDK) =>
  (networkId: number, serverURL: string): IO.IO<FwAdContext.AdContext> =>
    configure(networkId, serverURL)(create(SDK));
