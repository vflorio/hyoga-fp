import type * as IO from "fp-ts/IO";
import * as t from "io-ts";
import type { FwAdContext, FwAdSlot, FwSdk } from "..";

// Questi sono gli eventi necessari per l'integrazione fra videoAdapater e Freewheel SDK. Questi eventi sono emessi dal Freewheel SDK

export interface CoreHandlers {
  readonly onSlotStarted: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

// Core Events
export const SlotStarted = t.type({ _tag: t.literal("SlotStarted") });
export const SlotEnded = t.type({ _tag: t.literal("SlotEnded") });
export const ContentPauseRequest = t.type({ _tag: t.literal("ContentPauseRequest") });
export const ContentResumeRequest = t.type({ _tag: t.literal("ContentResumeRequest") });

export const CoreEvent = t.union([SlotStarted, SlotEnded, ContentPauseRequest, ContentResumeRequest]);
export type CoreEvent = t.TypeOf<typeof CoreEvent>;

// Handlers

export const registerHandlers =
  (adContext: FwAdContext.AdContext, SDK: FwSdk.SDK, handlers: CoreHandlers): IO.IO<void> =>
  () => {
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, handlers.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, handlers.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, handlers.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, handlers.onSlotEnded);
  };

export const removeHandlers =
  (adContext: FwAdContext.AdContext, SDK: FwSdk.SDK, handlers: CoreHandlers): IO.IO<void> =>
  () => {
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, handlers.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, handlers.onContentResumeRequest);
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, handlers.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, handlers.onSlotEnded);
  };
