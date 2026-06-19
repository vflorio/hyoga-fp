import { createLogger, type LogLevel } from "@hyoga-fp/core";
import { createPlayerFrom, type FreewheelConfig, type Player, type SDK, type VideoPlayer } from "@hyoga-fp/freewheel";
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

const freewheelConfig: FreewheelConfig = {
  profileId: config.profileId,
  videoAssetId: config.videoAssetId,
  videoDuration: config.videoDuration,
  siteSectionId: config.siteSectionId,
  networkId: config.networkId,
  fallbackSiteId: config.fallbackSiteId,
  videoContainer: config.videoContainer,
  disableAutoPause: config.disableAutoPause,
  temporalSlots: [
    { name: "Preroll_1", adUnit: "preroll", timePosition: 0 },
    { name: "Midroll_1", adUnit: "midroll", timePosition: 6 },
    { name: "Overlay_1", adUnit: "overlay", timePosition: 10 },
    { name: "Overlay_2", adUnit: "overlay", timePosition: 20 },
    { name: "Postroll_1", adUnit: "postroll", timePosition: 120 },
    { name: "pause_midroll_1", adUnit: "pause_midroll", timePosition: 0 },
  ],
  keyValues: [{ key: "skippable", value: "enabled" }],
};

const makePlayer = createPlayerFrom(freewheelConfig);

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

    playerRef.current = makePlayer({
      SDK,
      adContext,
      logger: createLogger("freewheel", config.logLevel as LogLevel),
      video: fromVideoElement(videoEl),
      onComplete: () => {},
      onOverlayShown: () => {
        const element = document.querySelector('[id^="_fw_ad_container_iframe_Overlay_2"]') as HTMLElement | null;
        if (element) element.style.marginBottom = "50px";
      },
      onAdBreakStarted: () => {
        console.log("[demo] Ad break started");
      },
      onContentResumed: () => {
        console.log("[demo] Content resumed");
      },
      onAdClick: (url) => () => {
        console.log(`[demo] Ad clicked, redirecting to: ${url}`);
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
