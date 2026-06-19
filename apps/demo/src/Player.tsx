import { createLogger } from "@hyoga-fp/core";
import { createPlayer, type Player, type SDK, type VideoPlayer } from "@hyoga-fp/freewheel";
import { useCallback, useEffect, useRef, useState } from "react";
import { match } from "ts-pattern";
import { config } from "./main";
import { type ButtonPhase, PlayerUI } from "./PlayerUI";

const fromVideoElement = (videoEl: HTMLVideoElement): VideoPlayer => ({
  play: () => videoEl.play(),
  pause: () => videoEl.pause(),
  getCurrentTime: () => videoEl.currentTime,
  seek: (src, at) => () => {
    videoEl.src = src;
    videoEl.currentTime = at;
  },
  enableControls: () => {
    videoEl.controls = true;
  },
  getSrc: () => (videoEl.querySelector("source") as HTMLSourceElement | null)?.src ?? videoEl.currentSrc,
  on: (event, handler) => () => videoEl.addEventListener(event, handler),
  off: (event, handler) => () => videoEl.removeEventListener(event, handler),
});

export function FwPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [phase, setPhase] = useState<ButtonPhase>("init");

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const SDK = (window as any).tv.freewheel.SDK as SDK;

    const adManager = new SDK.AdManager();
    adManager.setNetwork(config.networkId);
    adManager.setServer(config.serverURL);

    const adContext = adManager.newContext();

    playerRef.current = createPlayer({
      SDK,
      adContext,
      logger: createLogger("freewheel"),
      video: fromVideoElement(videoEl),
      configureContext: () => {
        // Disable US CCPA
        adContext.setParameter(SDK.PARAMETER_USE_CCPA_USPAPI, false, SDK.PARAMETER_LEVEL_GLOBAL);
        adContext.setParameter(
          SDK.PARAMETER_RENDERER_VIDEO_DISPLAY_CONTROLS_WHEN_PAUSE,
          false,
          SDK.PARAMETER_LEVEL_GLOBAL,
        );
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
        adContext.addTemporalSlot("Preroll_1", SDK.ADUNIT_PREROLL, 0);
        adContext.addTemporalSlot("Midroll_1", SDK.ADUNIT_MIDROLL, 6);
        adContext.addTemporalSlot("Overlay_1", SDK.ADUNIT_OVERLAY, 10);
        adContext.addTemporalSlot("Overlay_2", SDK.ADUNIT_OVERLAY, 20);
        adContext.addTemporalSlot("Postroll_1", SDK.ADUNIT_POSTROLL, 120);
        adContext.addTemporalSlot("pause_midroll_1", SDK.ADUNIT_PAUSE_MIDROLL, 0);

        adContext.registerVideoDisplayBase(config.videoContainer);
        adContext.addKeyValue("skippable", "enabled");
      },
      onComplete: () => location.reload(),
      onOverlayShown: () => {
        const element = document.querySelector('[id^="_fw_ad_container_iframe_Overlay_2"]') as HTMLElement | null;
        if (element) element.style.marginBottom = "50px";
      },
    });
  }, []);

  const handleClick = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    match(phase)
      .with("init", () => {
        setPhase("playing");
        player.requestAds();
      })
      .with("playing", () => {
        setPhase("paused");
        player.pause();
      })
      .with("paused", () => {
        setPhase("playing");
        player.resume();
      })
      .exhaustive();
  }, [phase]);

  return <PlayerUI phase={phase} onButtonClick={handleClick} videoRef={videoRef} />;
}
