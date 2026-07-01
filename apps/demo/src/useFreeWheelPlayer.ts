import { createLogger, EventStream, type LogLevel } from "@hyoga-fp/core";
import { type ContextRunner, type FreeWheel, FreeWheelPlayer, type Model } from "@hyoga-fp/freewheel";
import { constVoid } from "fp-ts/lib/function";
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

const adContextConfig = (SDK: FreeWheel.SDK): FreeWheelPlayer.Config => ({
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
    { name: "Preroll_1", adUnit: SDK.ADUNIT_PREROLL, timePosition: 0 },
    //{ name: "Preroll_2", adUnit: SDK.ADUNIT_PREROLL, timePosition: 0 }, TODO: Tests con slots multipli
    { name: "Midroll_1", adUnit: SDK.ADUNIT_MIDROLL, timePosition: config.videoDuration / 2 },
    { name: "Overlay_1", adUnit: SDK.ADUNIT_OVERLAY, timePosition: config.videoDuration / 6 },
    { name: "Overlay_2", adUnit: SDK.ADUNIT_OVERLAY, timePosition: config.videoDuration / 3 },
    { name: "Postroll_1", adUnit: SDK.ADUNIT_POSTROLL, timePosition: config.videoDuration },
    { name: "pause_midroll_1", adUnit: SDK.ADUNIT_PAUSE_MIDROLL, timePosition: 0 },
  ],
  keyValues: [{ key: "skippable", value: "enabled" }],
});

const usePlaywright = () => {
  const forward = (id: string) => (data: unknown) =>
    fetch(`http://localhost/${id}`, {
      method: "POST",
      body: JSON.stringify(data),
    }).catch(constVoid);

  return { forward };
};

export const useFreeWheelPlayer = () => {
  const SDK = (window as any).tv.freewheel.SDK as FreeWheel.SDK;

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement | null) => setVideoElement(node), []);

  const logger = useRef(createLogger("useFreeWheelPlayer", config.logLevel satisfies LogLevel));

  // Il lifecycle dell'EventStream è gestito dal consumer del player
  const eventStream = useRef(new EventStream<Model.SDKEvent>("freewheel-events"));

  const [runnerState, setRunnerState] = useState<ContextRunner.PlayerState | null>(null);

  const e2e = usePlaywright();

  // Creiamo un player parlialmente preconfigurato con una configurazione dell'AdContext standard
  const createPlayerWithAdContext = FreeWheelPlayer.createPlayerFrom(adContextConfig(SDK));

  const runner = useMemo(
    () =>
      videoElement &&
      createPlayerWithAdContext({
        SDK,
        logger: createLogger("FreeWheelPlayer", config.logLevel satisfies LogLevel),
        videoAdapter: createVideoAdapterFrom(videoElement),
        emit: eventStream.current.broadcast,
        emitStateChange: setRunnerState,
        emitAdsData: e2e.forward("e2e.adsData"),
      }),
    [videoElement],
  );

  // TODO: usePlaygright use events
  const lastState = useRef<ContextRunner.PlayerState | null>(null);
  useEffect(() => {
    if (!runnerState) return;
    if (runnerState.phase._tag === lastState.current?.phase._tag) return;

    e2e.forward(`e2e.state.${runnerState.phase._tag}`)(runnerState);

    lastState.current = runnerState;
  }, [runnerState]);

  async function listen() {
    for await (const event of eventStream.current) {
      match(event)
        .with({ _tag: "OverlayShown" }, () => {
          logger.current.info("[EventStream] Overlay ad shown")();

          // TODO: Le overlay coprono i controlli del video, vanno spostate manualmente
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

  return { videoRef, player: runner, state: runnerState };
};
