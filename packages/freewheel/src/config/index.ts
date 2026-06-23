import { FwADManager, FwADRequest } from "..";
import { type ContextRunner, type ContextRunnerDeps, createContextRunner } from "../contextRunner";

export interface Config {
  readonly serverURL: string;
  readonly videoContainer: string;
  // Disabilita la pausa automatica degli AD quando la pagina perde visibilità (es. cambio tab)
  readonly disableAutoPause: boolean;

  readonly profileId: string;
  readonly videoAssetId: string;
  readonly videoDuration: number;
  readonly siteSectionId: string;
  readonly networkId: number;
  readonly fallbackSiteId: number;

  readonly temporalSlots: ReadonlyArray<{
    readonly name: string;
    readonly adUnit: string;
    readonly timePosition: number;
  }>;

  readonly keyValues?: ReadonlyArray<{
    readonly key: string;
    readonly value: string;
  }>;
}

// @deprecated
// Crea un Player che utilizza il setupBusinessAdContext preconfigurato
export const createPlayerFrom =
  (config: Config) =>
  (deps: Omit<ContextRunnerDeps, "setupBusinessAdContext" | "adContext">): ContextRunner => {
    const adContext = FwADManager.createAndConfigure(deps.SDK)(config.networkId, config.serverURL)();

    return createContextRunner({
      ...deps,
      adContext,
      setupBusinessAdContext: FwADRequest.setupBusinessDefaults({ SDK: deps.SDK, adContext })(config),
    });
  };
