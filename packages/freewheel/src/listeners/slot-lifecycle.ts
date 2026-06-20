import { type CategoryPair, type DiagnosticDeps, dispatch } from "./types";

export const withSlotLifecycle = (deps: DiagnosticDeps): CategoryPair => {
  const { adContext, SDK } = deps;

  const extractSlot = (e: any): { customId: string; timePositionClass: string; adCount: number } | null => {
    const slot = e?.slot;
    if (!slot) return null;
    return {
      customId: slot.getCustomId?.() ?? "unknown",
      timePositionClass: slot.getTimePositionClass?.() ?? "unknown",
      adCount: typeof slot.getAdCount === "function" ? slot.getAdCount() : 0,
    };
  };

  const handlers = {
    onSlotImpression: dispatch(deps, "SLOT_IMPRESSION", (e) => {
      const s = extractSlot(e);
      return s ? { _tag: "SlotImpression", ...s } : null;
    }),
    onSlotEnd: dispatch(deps, "SLOT_END", (e) => {
      const s = extractSlot(e);
      return s ? { _tag: "SlotEnd", ...s } : null;
    }),
  };

  const bindings: [string, (e: any) => void][] = [
    [SDK.EVENT_SLOT_IMPRESSION, handlers.onSlotImpression],
    [SDK.EVENT_SLOT_END, handlers.onSlotEnd],
  ];

  return {
    register: () => bindings.forEach(([ev, fn]) => adContext.addEventListener(ev, fn)),
    remove: () => bindings.forEach(([ev, fn]) => adContext.removeEventListener(ev, fn)),
  };
};
