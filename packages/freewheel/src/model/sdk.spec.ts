import { createEventIterator } from "@hyoga-fp/core";
import { describe, expect, it } from "vitest";
import type * as Model from ".";

describe("SDKEvent with createEventIterator from core", () => {
  it("emits typed SDK events through the core iterator", async () => {
    const iter = createEventIterator<Model.SDK.SDKEvent>(({ emit, cancel }) => {
      emit({ _tag: "AdBreakStarted" });
      emit({ _tag: "AdImpression", adId: "a1" });
      emit({ _tag: "ContentResumed" });
      cancel();
    });

    const events: string[] = [];

    for await (const event of iter) {
      events.push(event._tag);
    }

    expect(events).toEqual(["AdBreakStarted", "AdImpression", "ContentResumed"]);
  });

  it("works with async emission", async () => {
    const iter = createEventIterator<Model.SDK.SDKEvent>(({ emit, cancel }) => {
      setTimeout(() => emit({ _tag: "AdBreakStarted" }), 10);
      setTimeout(() => emit({ _tag: "Complete" }), 20);
      setTimeout(() => cancel(), 30);
    });

    const events: string[] = [];

    for await (const event of iter) {
      events.push(event._tag);
    }

    expect(events).toEqual(["AdBreakStarted", "Complete"]);
  });
});
