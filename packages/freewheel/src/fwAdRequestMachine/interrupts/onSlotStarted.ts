import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import { match } from "ts-pattern";
import { FwAdSlot } from "../..";
import type { FwAdRequestMachineDeps } from "..";

export type SlotStarted =
  | { readonly _tag: "Event/Slot/Started" }
  | { readonly _tag: "Event/Preroll/Started"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/Midroll/Started"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/PauseMidroll/Started"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/Postroll/Started"; slot: FwAdSlot.AdSlot }
  | { readonly _tag: "Event/Overlay/Started"; slot: FwAdSlot.AdSlot };

export const onSlotStarted =
  (deps: FwAdRequestMachineDeps) =>
  ({ slot }: { slot: FwAdSlot.AdSlot }): IO.IO<void> =>
    pipe(
      IO.of(FwAdSlot.from(deps.SDK)(slot)),
      IO.tap(({ slot }) =>
        deps.logger.info(`[Interrupts] onSlotStarted ${slot.getTimePositionClass()} (breaks: ${slot.getAdCount()})`),
      ),
      IO.tap(() => deps.emitIO({ _tag: "Event/Slot/Started" })),
      IO.flatMap((slotKind) =>
        match(slotKind)
          .with({ _tag: "Preroll" }, () => deps.emitIO({ _tag: "Event/Preroll/Started", slot }))
          .with({ _tag: "Postroll" }, () => deps.emitIO({ _tag: "Event/Postroll/Started", slot }))
          .with({ _tag: "Midroll" }, () => deps.emitIO({ _tag: "Event/Midroll/Started", slot }))
          .with({ _tag: "PauseMidroll" }, () => deps.emitIO({ _tag: "Event/PauseMidroll/Started", slot }))
          .with({ _tag: "Overlay" }, () => deps.emitIO({ _tag: "Event/Overlay/Started", slot }))
          .exhaustive(),
      ),
    );
