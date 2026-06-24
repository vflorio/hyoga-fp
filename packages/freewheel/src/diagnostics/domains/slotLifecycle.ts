import { type DiagnosticsDomainHandler, dispatchSdkEvent } from "..";
import type { DiagnosticDeps } from "../diagnostics";

export const withSlotLifecycle = (deps: DiagnosticDeps): DiagnosticsDomainHandler => {
  const { adContext, SDK } = deps;

  // TODO: Migliorare la type-safety del parsing dell'event e migrare a unkwnown
  const extractSlot = (rawEvent: any): { customId: string; timePositionClass: string; adCount: number } | null => {
    const slot = rawEvent?.slot;
    if (!slot) return null;
    return {
      customId: slot.getCustomId?.() ?? "unknown",
      timePositionClass: slot.getTimePositionClass?.() ?? "unknown",
      adCount: slot.getAdCount?.() ?? 0,
    };
  };

  const adapter = {
    onSlotImpression: dispatchSdkEvent(deps, "SLOT_IMPRESSION", (rawEvent) => {
      const slot = extractSlot(rawEvent);
      return slot
        ? {
            _tag: "SlotImpression",
            ...slot,
          }
        : null;
    }),
    onSlotEnd: dispatchSdkEvent(deps, "SLOT_END", (rawEvent) => {
      const slot = extractSlot(rawEvent);
      return slot
        ? {
            _tag: "SlotEnd",
            ...slot,
          }
        : null;
    }),
  };

  const bindings: [string, (rawEvent: any) => void][] = [
    [SDK.EVENT_SLOT_IMPRESSION, adapter.onSlotImpression],
    [SDK.EVENT_SLOT_END, adapter.onSlotEnd],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
