import type { IO } from ".";
import type * as FreeWheel from "./freewheel";
import { createPlayer, type Player, type PlayerDeps } from "./player";

/**
 * Standard FreeWheel configuration for ad request setup.
 * Contains all values needed to configure the ad context before submission.
 */
export interface FreewheelConfig {
  readonly profileId: string;
  readonly videoAssetId: string;
  readonly videoDuration: number;
  readonly siteSectionId: string;
  readonly networkId: number;
  readonly fallbackSiteId: number;
  readonly videoContainer: string;
  readonly disableAutoPause: boolean;
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

/**
 * Builds a configureContext IO from a FreewheelConfig + SDK/adContext.
 * This is the standard FreeWheel context setup extracted from typical integrations.
 */
export const defaultConfigureContext =
  (config: FreewheelConfig) =>
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

/**
 * Curried player constructor: apply a FreewheelConfig to get a factory
 * that only needs the remaining PlayerDeps (without configureContext).
 *
 * Usage:
 *   const makePlayer = createPlayerFrom(myConfig);
 *   const player = makePlayer({ SDK, adContext, video, logger, ... });
 */
export const createPlayerFrom =
  (config: FreewheelConfig) =>
  (deps: Omit<PlayerDeps, "configureContext">): Player =>
    createPlayer({
      ...deps,
      configureContext: defaultConfigureContext(config)(deps.SDK, deps.adContext),
    });
