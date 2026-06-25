import type * as IO from "fp-ts/IO";
import type { Config } from "../config";
import type { AdRequestDeps } from ".";

// -------------------------------------------------------------------------------------
// Technical setup
// -------------------------------------------------------------------------------------

export const setupTechnicalDefaults =
  (deps: AdRequestDeps): IO.IO<void> =>
  () => {
    // Force async VAST loading to prevent synchronous XHR blocking the main thread
    deps.adContext.setParameter("translator.vast.asyncLoad", true, deps.SDK.PARAMETER_LEVEL_OVERRIDE);
  };

// -------------------------------------------------------------------------------------
// Business setup
// -------------------------------------------------------------------------------------

export const setupBusinessAdContext =
  (deps: AdRequestDeps) =>
  (config: Config): IO.IO<void> =>
  () => {
    const { SDK, adContext } = deps;

    // Pausa & Visibilità
    adContext.setParameter(SDK.PARAMETER_RENDERER_VIDEO_DISPLAY_CONTROLS_WHEN_PAUSE, false, SDK.PARAMETER_LEVEL_GLOBAL);
    if (config.disableAutoPause) {
      adContext.setParameter(SDK.PARAMETER_AUTO_PAUSE_AD_ONVISIBILITYCHANGE, false, SDK.PARAMETER_LEVEL_GLOBAL);
    }

    // US CCPA
    adContext.setParameter(SDK.PARAMETER_USE_CCPA_USPAPI, false, SDK.PARAMETER_LEVEL_GLOBAL);

    // Increase the maximum number of VAST 302 redirects, required for Google Programmatic
    adContext.setParameter(SDK.PARAMETER_VAST_MAX_WRAPPER_COUNT, 7, SDK.PARAMETER_LEVEL_OVERRIDE);
    // Carica OMSDK.js sul frontend
    adContext.setParameter(SDK.PARAMETER_EXTENSION_OMSDK_ENABLED, true, SDK.PARAMETER_LEVEL_GLOBAL);

    adContext.setProfile(config.profileId);

    adContext.setVideoAsset(
      config.videoAssetId,
      config.videoDuration,
      config.networkId,
      null,
      SDK.VIDEO_ASSET_AUTO_PLAY_TYPE_ATTENDED,
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

    // FIXME TODO: controllare che nel sorgente dell'esempio originale di Fw, ci sia
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
