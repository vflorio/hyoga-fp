import type * as IO from "fp-ts/IO";
import * as t from "io-ts";
import type { FwAdContext, FwAdSlot, FwSdk } from "..";

export interface Handlers {
  readonly onSlotStarted: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onSlotEnded: (event: { slot: FwAdSlot.AdSlot }) => void;
  readonly onContentPauseRequest: () => void;
  readonly onContentResumeRequest: () => void;
}

// Media Events
export const SlotStarted = t.type({ _tag: t.literal("SlotStarted") });
export const SlotEnded = t.type({ _tag: t.literal("SlotEnded") });
export const ContentPauseRequest = t.type({ _tag: t.literal("ContentPauseRequest") });
export const ContentResumeRequest = t.type({ _tag: t.literal("ContentResumeRequest") });

export const MediaEvent = t.union([SlotStarted, SlotEnded, ContentPauseRequest, ContentResumeRequest]);
export type MediaEvent = t.TypeOf<typeof MediaEvent>;

// Media Event Listeners

export const registerHandlers =
  (adContext: FwAdContext.AdContext, SDK: FwSdk.SDK, handlers: Handlers): IO.IO<void> =>
  () => {
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, handlers.onContentPauseRequest);
    adContext.addEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, handlers.onContentResumeRequest);
    adContext.addEventListener(SDK.EVENT_SLOT_STARTED, handlers.onSlotStarted);
    adContext.addEventListener(SDK.EVENT_SLOT_ENDED, handlers.onSlotEnded);
  };

export const removeHandlers =
  (adContext: FwAdContext.AdContext, SDK: FwSdk.SDK, handlers: Handlers): IO.IO<void> =>
  () => {
    adContext.removeEventListener(SDK.EVENT_SLOT_STARTED, handlers.onSlotStarted);
    adContext.removeEventListener(SDK.EVENT_SLOT_ENDED, handlers.onSlotEnded);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_PAUSE_REQUEST, handlers.onContentPauseRequest);
    adContext.removeEventListener(SDK.EVENT_CONTENT_VIDEO_RESUME_REQUEST, handlers.onContentResumeRequest);
  };
