import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as T from "fp-ts/Task";
import type { FreeWheel } from "../../freeWheel";
import * as Listeners from "../../listeners";
import * as Transitions from "../transitions";
import type { ADContextPlayerOpContext } from "../types";

export interface RequestOps {
  readonly requestAds: T.Task<void>;
}

export const createRequestOps = (
  context: ADContextPlayerOpContext,
  coreHandlers: Listeners.CoreHandlers,
  playPreroll: IO.IO<void>,
): RequestOps => {
  const { stateRef, adContext, SDK, logger } = context;

  const getTemporalSlots: T.Task<ReadonlyArray<FreeWheel.AdSlot>> = () =>
    new Promise((resolve) => {
      const handler = (event: { success: boolean }) => {
        adContext.removeEventListener(SDK.EVENT_REQUEST_COMPLETE, handler);
        resolve(event.success ? adContext.getTemporalSlots() : []);
      };

      adContext.addEventListener(SDK.EVENT_REQUEST_COMPLETE, handler);
      adContext.submitRequest();
    });

  const setupTechnicalAdContext: IO.IO<void> = pipe(
    logger.info("setupBusinessAdContext: configuring ad context"),
    IO.flatMap(
      () => () =>
        // Force async VAST loading to prevent synchronous XHR blocking the main thread
        adContext.setParameter("translator.vast.asyncLoad", true, SDK.PARAMETER_LEVEL_OVERRIDE),
    ),
  );

  const requestAds: T.Task<void> = pipe(
    T.fromIO(
      pipe(
        logger.info("requestAds: configuring ad context"),
        IO.flatMap(() => setupTechnicalAdContext), // Configurazione ADContext TECNICA
        IO.flatMap(() => context.setupBusinessAdContext), // Configurazione ADContext BUSINESS
        IO.flatMap(() => logger.debug("requestAds: registering SDK event listeners")),
        IO.flatMap(() => Listeners.registerCoreHandlers(adContext, SDK, coreHandlers)),
      ),
    ),
    T.flatMap(T.fromIOK(() => logger.info("requestAds: submitting ad request"))),
    T.flatMap(() => getTemporalSlots),
    T.flatMap((slots) =>
      T.fromIO(
        pipe(
          logger.info(`requestAds: received ${slots.length} slots`, { slots }),
          IO.flatMap(() =>
            logger.debug("requestAds: slot breakdown", {
              preroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_PREROLL).length,
              midroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_MIDROLL).length,
              overlay: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_OVERLAY).length,
              postroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_POSTROLL).length,
              pauseMidroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL)
                .length,
            }),
          ),
          IO.flatMap(() =>
            stateRef.modify(
              Transitions.applySlots({
                TIME_POSITION_CLASS_PREROLL: SDK.TIME_POSITION_CLASS_PREROLL,
                TIME_POSITION_CLASS_MIDROLL: SDK.TIME_POSITION_CLASS_MIDROLL,
                TIME_POSITION_CLASS_OVERLAY: SDK.TIME_POSITION_CLASS_OVERLAY,
                TIME_POSITION_CLASS_POSTROLL: SDK.TIME_POSITION_CLASS_POSTROLL,
                TIME_POSITION_CLASS_PAUSE_MIDROLL: SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
              })(slots),
            ),
          ),
          IO.flatMap(() => logger.debug("requestAds: state updated, starting preroll chain")),
          IO.flatMap(() => playPreroll),
        ),
      ),
    ),
  );

  return { requestAds };
};
