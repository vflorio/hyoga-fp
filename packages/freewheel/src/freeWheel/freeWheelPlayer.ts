import type * as IO from "fp-ts/IO";
import { type ContextRunner, type ContextRunnerDeps, createContextRunner } from "../contextRunner";
import type * as FreeWheel from "./freeWheel";

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

// Configurazione standard dell'AdContext di FreeWheel AdManager SDK
export const createDefaultBusinessSetupAdContext =
  (config: Config) =>
  (SDK: FreeWheel.SDK, adContext: FreeWheel.AdContext): IO.IO<void> =>
  () => {
    // Disable US CCPA
    adContext.setParameter(SDK.PARAMETER_USE_CCPA_USPAPI, false, SDK.PARAMETER_LEVEL_GLOBAL);
    adContext.setParameter(SDK.PARAMETER_RENDERER_VIDEO_DISPLAY_CONTROLS_WHEN_PAUSE, false, SDK.PARAMETER_LEVEL_GLOBAL);
    if (config.disableAutoPause) {
      adContext.setParameter(SDK.PARAMETER_AUTO_PAUSE_AD_ONVISIBILITYCHANGE, false, SDK.PARAMETER_LEVEL_GLOBAL);
    }
    // Increase the maximum number of VAST 302 redirects, required for Google Programmatic
    adContext.setParameter(SDK.PARAMETER_VAST_MAX_WRAPPER_COUNT, 7, SDK.PARAMETER_LEVEL_OVERRIDE);
    adContext.setParameter(SDK.PARAMETER_EXTENSION_OMSDK_ENABLED, true, SDK.PARAMETER_LEVEL_GLOBAL);

    adContext.setProfile(config.profileId);

    // This will affect the flag parameter in the ad request. Whether the video will be played without user interactive, must be one of:
    //  <VIDEO_ASSET_AUTO_PLAY_TYPE_NONE> - Will add -play to flag to ad request.
    //  <VIDEO_ASSET_AUTO_PLAY_TYPE_ATTENDED> - Will ad +play-uapl to flag in ad request.
    //  <VIDEO_ASSET_AUTO_PLAY_TYPE_UNATTENDED> - Will add +play+uapl to flag to ad request.
    //  <VIDEO_ASSET_AUTO_PLAY_TYPE_CLICK_TO_PLAY> - Will add +cltp to flag to ad request.
    const autoplayType = SDK.VIDEO_ASSET_AUTO_PLAY_TYPE_ATTENDED;

    adContext.setVideoAsset(
      config.videoAssetId,
      config.videoDuration,
      config.networkId,
      null,
      autoplayType,
      Math.round(Math.random() * 10000),
      SDK.ID_TYPE_CUSTOM,
      "0",
      SDK.VIDEO_ASSET_DURATION_TYPE_EXACT,
    );
    adContext.setSiteSection(
      config.siteSectionId,
      config.networkId,
      Math.round(Math.random() * 10000),
      SDK.ID_TYPE_CUSTOM,
      config.fallbackSiteId,
    );

    // Temporal slots
    for (const slot of config.temporalSlots) {
      adContext.addTemporalSlot(slot.name, slot.adUnit, slot.timePosition);
    }

    // Key-values
    if (config.keyValues) {
      for (const kv of config.keyValues) {
        adContext.addKeyValue(kv.key, kv.value);
      }
    }

    adContext.registerVideoDisplayBase(config.videoContainer);
  };

// Crea un Player che utilizza il setupBusinessAdContext preconfigurato
export const createPlayerFrom =
  (config: Config) =>
  (deps: Omit<ContextRunnerDeps, "setupBusinessAdContext" | "adContext">): ContextRunner => {
    const createAdContext = () => {
      const adManager = new deps.SDK.AdManager();

      adManager.setNetwork(config.networkId);
      adManager.setServer(config.serverURL);
      return adManager.newContext();
    };

    const adContext = createAdContext();

    return createContextRunner({
      ...deps,
      adContext,
      setupBusinessAdContext: createDefaultBusinessSetupAdContext(config)(deps.SDK, adContext),
    });
  };
