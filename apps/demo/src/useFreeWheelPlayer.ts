import { createLogger, EventStream, type LogLevel } from "@hyoga-fp/core";
import { type ContextRunner, type FreeWheel, FreeWheelPlayer, type Model } from "@hyoga-fp/freewheel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { match } from "ts-pattern";
import { config } from "./env";

const createVideoAdapterFrom = (videoEl: HTMLVideoElement): ContextRunner.ContextRunnerVideoAdapter => ({
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

const adContextConfig: FreeWheelPlayer.Config = {
  serverURL: config.serverURL,
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

export const useFreeWheelPlayer = () => {
  const SDK = (window as any).tv.freewheel.SDK as FreeWheel.SDK;

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement | null) => setVideoElement(node), []);

  const logger = useRef(createLogger("useFreeWheelPlayer", config.logLevel satisfies LogLevel));

  // Il lifecycle dell'EventStream è gestito dal consumer del player
  const eventStream = useRef(new EventStream<Model.SDKEvent>("freewheel-events"));

  // Creiamo un player parlialmente preconfigurato con una configurazione dell'AdContext standard
  const createPlayer = FreeWheelPlayer.createPlayerFrom(adContextConfig);

  const player = useMemo(
    () =>
      videoElement &&
      createPlayer({
        SDK,
        logger: createLogger("FreeWheelPlayer", config.logLevel satisfies LogLevel),
        videoAdapter: createVideoAdapterFrom(videoElement),
        emit: eventStream.current.broadcast,
      }),
    [videoElement],
  );

  async function listen() {
    for await (const event of eventStream.current) {
      match(event)
        .with({ _tag: "OverlayShown" }, () => {
          logger.current.info("[EventStream] Overlay ad shown")();

          // FIXME rimuovere
          const element = document.querySelector('[id^="_fw_ad_container_iframe_Overlay_2"]') as HTMLElement | null;
          if (element) element.style.marginBottom = "50px";
        })
        .otherwise((event) => logger.current.debug("[EventStream] SDK event:", event)());
    }
  }

  useEffect(() => {
    listen();

    return () => {
      eventStream.current.close();
    };
  }, []);

  return { videoRef, player, listen, close: () => eventStream.current.close() };
};
