import { match as matchT } from "ts-pattern";
import type { FwAdSlot, FwSdk } from "..";

export type SlotKind =
  | { readonly _tag: "Preroll"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Midroll"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "PauseMidroll"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Postroll"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Overlay"; slot: FwAdSlot.AdSlot };

export type UnknownSlotKind = { readonly _tag: "Unknown"; slot: FwAdSlot.AdSlot };

type Match<S, T> = ReturnType<typeof matchT<S, T>>;

export const match = <T>(slot: SlotKind): Match<SlotKind, T> => matchT<SlotKind, T>(slot);

export const from =
  (sdk: FwSdk.SDK) =>
  (slot: FwAdSlot.AdSlot): SlotKind =>
    matchT(slot.getTimePositionClass())
      .with(sdk.TIME_POSITION_CLASS_PREROLL, () => ({ _tag: "Preroll", slot }) as const)
      .with(sdk.TIME_POSITION_CLASS_POSTROLL, () => ({ _tag: "Postroll", slot }) as const)
      .with(sdk.TIME_POSITION_CLASS_MIDROLL, () => ({ _tag: "Midroll", slot }) as const)
      .with(sdk.TIME_POSITION_CLASS_PAUSE_MIDROLL, () => ({ _tag: "PauseMidroll", slot }) as const)
      .with(sdk.TIME_POSITION_CLASS_OVERLAY, () => ({ _tag: "Overlay", slot }) as const)
      // FIXME: Gestire come UnknownSlotKind
      .otherwise(() => ({ _tag: "Overlay", slot }) as const);
