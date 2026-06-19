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
    adContext.setProfile(config.profileId);
    adContext.setVideoAsset(config.videoAssetId, config.videoDuration);
    adContext.setSiteSection(config.siteSectionId);

    playerRef.current = createPlayer({
      SDK,
      adContext,
      logger: createLogger("freewheel"),
      video: fromVideoElement(videoEl),
      onComplete: () => location.reload(), // TODO, rivalutare l'esempio della doc ufficiale, così da poterlo togliere
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
