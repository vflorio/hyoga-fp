import { createLogger, EventStream, type LogLevel } from "@hyoga-fp/core";
import { Config, type FreeWheel, type Model, type Player } from "@hyoga-fp/freewheel";
import { useEffect, useMemo, useRef } from "react";
import { match } from "ts-pattern";
import { config } from "./env";

const fromVideoElement = (videoEl: HTMLVideoElement): Player.VideoPlayer => ({
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

const freewheelConfig: Config.FreewheelConfig = {
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

export const useFreeWheelPlayer = (videoElement: HTMLVideoElement | null) => {
  const SDK = (window as any).tv.freewheel.SDK as FreeWheel.SDK;

  const eventStream = useRef(new EventStream<Model.SDK.SDKEvent>("freewheel-events"));

  const adContext = useRef(
    (() => {
      const adManager = new SDK.AdManager();
      adManager.setNetwork(config.networkId);
      adManager.setServer(config.serverURL);

      return adManager.newContext();
    })(),
  );

  const makePlayer = Config.createPlayerFrom(freewheelConfig);

  const player = useMemo(
    () =>
      videoElement &&
      makePlayer({
        SDK,
        adContext: adContext.current,
        logger: createLogger("freewheel", config.logLevel satisfies LogLevel),
        video: fromVideoElement(videoElement),
        emit: (event) => eventStream.current.broadcast(event),
      }),
    [videoElement],
  );

  async function listen() {
    for await (const event of eventStream.current) {
      match(event)
        .with({ _tag: "OverlayShown" }, () => {
          console.log("[demo] Overlay ad shown");

          // FIXME rimuovere
          const element = document.querySelector('[id^="_fw_ad_container_iframe_Overlay_2"]') as HTMLElement | null;
          if (element) element.style.marginBottom = "50px";
        })
        .otherwise((e) => console.debug("[demo] SDK event:", e._tag));
    }
  }

  useEffect(() => {
    listen();

    return () => {
      eventStream.current.close();
    };
  }, []);

  return [player, listen, eventStream.current.close] as const;
};
