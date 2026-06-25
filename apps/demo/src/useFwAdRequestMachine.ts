import { createLogger, EventStream, type LogLevel } from "@hyoga-fp/core";
import {
  type Config,
  FwAdManager,
  FwAdRequest,
  FwAdRequestMachine,
  type FwAdRequestPlayerAdapter,
  type FwSdk,
} from "@hyoga-fp/freewheel";
import * as IO from "fp-ts/IO";
import { constVoid, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { match } from "ts-pattern";
import { config } from "./env";

const createVideoAdapterFrom = (videoEl: HTMLVideoElement): FwAdRequestPlayerAdapter.Adapter => ({
  play: () => {
    videoEl.play();
  },
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

const adContextConfig: Config.Config = {
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

export const useFwAdRequestMachine = () => {
  const SDK = (window as any).tv.SDK as FwSdk.SDK;

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement | null) => setVideoElement(node), []);

  const logger = useRef(createLogger("useFwAdRequestMachine", config.logLevel satisfies LogLevel));

  const [machineState, setMachineState] = useState<FwAdRequestMachine.State | null>(null);

  // Il lifecycle dell'EventStream è gestito questo hook
  const stream = useMemo(() => new EventStream<FwSdk.Event>("machine-events"), []);

  useEffect(() => () => stream.close(), [stream]);

  const machine = useMemo<O.Option<FwAdRequestMachine.Instance>>(() => {
    if (!videoElement) return O.none;

    const createAdContext = FwAdManager.createWithConfig(SDK)(adContextConfig.networkId, adContextConfig.serverURL);

    const emit = (event: any) => {
      if (stream.closed) {
        logger.current.error("[useFwAdRequestMachine] EventStream is closed, cannot emit event:", event)();
        return;
      }
      stream.broadcast(event);
    };

    const adContext = createAdContext();

    const instance = new FwAdRequestMachine.Instance({
      SDK,
      adContext,
      logger: createLogger("FwAdRequestMachineInstance", config.logLevel satisfies LogLevel),
      getVideoAdapter: () => createVideoAdapterFrom(videoElement),
      setupBusinessAdContext: FwAdRequest.setupBusinessAdContext({ SDK, adContext })(adContextConfig),
      emitStateChange: setMachineState,
      emit,
      emitIO: IO.of(emit),
    });

    // WIP
    //instance.onStateChange((state) => pipe(logger.current.info("[useFwAdRequestMachine] onStateChange:", state)));

    return O.some(instance);
  }, [videoElement, stream]);

  useEffect(() => {
    async function listen() {
      for await (const event of stream) {
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

    listen();

    return pipe(
      machine,
      O.match(
        () => constVoid,
        (instance) => instance.earlyDispose,
      ),
      IO.flatMap(() => logger.current.info("[useFwAdRequestMachine] earlyDispose (reason: useEffect unmount)")),
    );
  }, []);

  return { videoRef, machine, state: machineState };
};
