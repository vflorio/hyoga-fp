import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import { FwAdSlot } from "../..";
import type { FwAdRequestMachineDeps } from "..";

export type SlotEnded =
  | { readonly _tag: "Event/Slot/Ended" }
  | { readonly _tag: "Event/Preroll/Ended"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/Midroll/Ended"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/PauseMidroll/Ended"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/Postroll/Ended"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/Overlay/Ended"; slot: FwAdSlot.AdSlot };

export const onSlotEnded =
  (deps: FwAdRequestMachineDeps) =>
  ({ slot }: { slot: FwAdSlot.AdSlot }): IO.IO<void> =>
    pipe(
      IO.of(FwAdSlot.from(deps.SDK)(slot)),
      IO.tap(({ slot }) =>
        deps.logger.info(`[Interrupts] onSlotEnded ${slot.getTimePositionClass()} (breaks: ${slot.getAdCount()})`),
      ),
      IO.tap(() => deps.emitIO({ _tag: "Event/Slot/Ended" })),
      IO.flatMap((slotKind) =>
        match(slotKind)
          .with({ _tag: "Preroll" }, () => deps.emitIO({ _tag: "Event/Preroll/Ended", slot }))
          .with({ _tag: "Postroll" }, () => deps.emitIO({ _tag: "Event/Postroll/Ended", slot }))
          .with({ _tag: "Midroll" }, () => deps.emitIO({ _tag: "Event/Midroll/Ended", slot }))
          .with({ _tag: "PauseMidroll" }, () => deps.emitIO({ _tag: "Event/PauseMidroll/Ended", slot }))
          .with({ _tag: "Overlay" }, () => deps.emitIO({ _tag: "Event/Overlay/Ended", slot }))
          .exhaustive(),
      ),
    );
