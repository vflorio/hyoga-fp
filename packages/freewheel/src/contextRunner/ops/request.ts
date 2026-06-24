import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as T from "fp-ts/Task";
import type { FwAdSlot } from "../..";
import type { ContextRunnerOpContext } from "..";
import * as Transitions from "../transitions";

export interface RequestOps {
  readonly requestAds: T.Task<void>;
}

export const createRequestOps = (context: ContextRunnerOpContext, playPreroll: IO.IO<void>): RequestOps => {
  const { setState, adContext, SDK, logger } = context;

  const submitAdRequest: T.Task<ReadonlyArray<FwAdSlot.AdSlot>> = () =>
    new Promise((resolve) => {
      const handler = (event: { success: boolean }) => {
        adContext.removeEventListener(SDK.EVENT_REQUEST_COMPLETE, handler);
        resolve(event.success ? adContext.getTemporalSlots() : []);
      };

      adContext.addEventListener(SDK.EVENT_REQUEST_COMPLETE, handler);
      adContext.submitRequest();
    });

  const setupTechnicalAdContext: IO.IO<void> = pipe(
    logger.info("[RequestOps] setupBusinessAdContext: configuring ad context"),
    IO.flatMap(
      () => () =>
        // Force async VAST loading to prevent synchronous XHR blocking the main thread
        adContext.setParameter("translator.vast.asyncLoad", true, SDK.PARAMETER_LEVEL_OVERRIDE),
    ),
  );

  const requestAds: T.Task<void> = pipe(
    T.fromIO(
      pipe(
        logger.info("[RequestOps] requestAds: configuring ad context"),
        IO.flatMap(() => setupTechnicalAdContext), // Configurazione ADContext TECNICA
        IO.flatMap(() => context.setupBusinessAdContext), // Configurazione ADContext BUSINESS
        IO.flatMap(() => logger.debug("[RequestOps] requestAds: registering SDK event listeners")),
      ),
    ),
    T.flatMap(T.fromIOK(() => logger.info("[RequestOps] requestAds: submitting ad request"))),
    T.flatMap(() => submitAdRequest),
    T.flatMap((slots) =>
      T.fromIO(
        pipe(
          logger.info(`[RequestOps] requestAds: received ${slots.length} slots`, { slots }),
          IO.flatMap(() =>
            logger.debug("[RequestOps] requestAds: slot breakdown", {
              preroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_PREROLL).length,
              midroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_MIDROLL).length,
              overlay: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_OVERLAY).length,
              postroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_POSTROLL).length,
              pauseMidroll: slots.filter((s) => s.getTimePositionClass() === SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL)
                .length,
            }),
          ),
          IO.flatMap(() => setState(Transitions.applySlots(SDK)(slots))),
          IO.flatMap(() => logger.debug("[RequestOps] requestAds: state updated, starting preroll chain")),
          IO.flatMap(() => playPreroll),
        ),
      ),
    ),
  );

  return { requestAds };
};
