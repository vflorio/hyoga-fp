import { describe, expect, it } from "vitest";
import {
  createStateMachine,
  getProgress,
  getSkippedStates,
  hasErrors,
  isComplete,
  isTerminal,
  transition,
} from "./state-machine.js";

describe("Ad Session State Machine", () => {
  it("creates initial state at NOT_REQUESTED", () => {
    const sm = createStateMachine("creative-1");
    expect(sm.currentState).toBe("NOT_REQUESTED");
    expect(sm.history).toHaveLength(0);
    expect(sm.errors).toHaveLength(0);
  });

  it("transitions through full lifecycle", () => {
    let sm = createStateMachine("creative-1");
    let t = 1000;

    const states = [
      "REQUESTED",
      "RESPONSE_RECEIVED",
      "SCHEDULED",
      "RENDERED",
      "VISIBLE",
      "STARTED",
      "FIRST_QUARTILE",
      "MIDPOINT",
      "THIRD_QUARTILE",
      "COMPLETE",
    ] as const;

    for (const state of states) {
      const result = transition(sm, state, t);
      expect(result.result.valid).toBe(true);
      sm = result.machine;
      t += 1000;
    }

    expect(isComplete(sm)).toBe(true);
    expect(isTerminal(sm)).toBe(true);
    expect(hasErrors(sm)).toBe(false);
    expect(sm.history).toHaveLength(10);
  });

  it("rejects invalid transitions", () => {
    const sm = createStateMachine("creative-1");
    // Cannot go from NOT_REQUESTED directly to STARTED
    const result = transition(sm, "STARTED", 1000);
    expect(result.result.valid).toBe(false);
    expect(result.result.error).toContain("Invalid transition");
  });

  it("allows short ads to skip quartiles", () => {
    let sm = createStateMachine("creative-1");
    let t = 1000;

    for (const state of ["REQUESTED", "RESPONSE_RECEIVED", "SCHEDULED", "RENDERED", "VISIBLE", "STARTED"] as const) {
      sm = transition(sm, state, t).machine;
      t += 100;
    }

    // Short ad goes straight to COMPLETE from STARTED
    const result = transition(sm, "COMPLETE", t);
    expect(result.result.valid).toBe(true);
    expect(isComplete(result.machine)).toBe(true);
  });

  it("detects non-monotonic timestamps", () => {
    let sm = createStateMachine("creative-1");
    sm = transition(sm, "REQUESTED", 2000).machine;
    const result = transition(sm, "RESPONSE_RECEIVED", 1000); // earlier timestamp
    expect(result.result.valid).toBe(false);
    expect(result.result.error).toContain("Non-monotonic timestamp");
  });

  it("allows transition to ERROR from any non-terminal state", () => {
    let sm = createStateMachine("creative-1");
    sm = transition(sm, "REQUESTED", 1000).machine;
    sm = transition(sm, "RESPONSE_RECEIVED", 2000).machine;
    const result = transition(sm, "ERROR", 3000);
    expect(result.result.valid).toBe(true);
    expect(isTerminal(result.machine)).toBe(true);
  });

  it("allows transition to SKIPPED from SCHEDULED onwards", () => {
    let sm = createStateMachine("creative-1");
    sm = transition(sm, "REQUESTED", 1000).machine;
    sm = transition(sm, "RESPONSE_RECEIVED", 2000).machine;
    sm = transition(sm, "SCHEDULED", 3000).machine;
    const result = transition(sm, "SKIPPED", 4000);
    expect(result.result.valid).toBe(true);
    expect(isTerminal(result.machine)).toBe(true);
  });

  it("detects skipped states", () => {
    let sm = createStateMachine("creative-1");
    sm = transition(sm, "REQUESTED", 1000).machine;
    sm = transition(sm, "RESPONSE_RECEIVED", 2000).machine;
    sm = transition(sm, "SCHEDULED", 3000).machine;
    sm = transition(sm, "RENDERED", 4000).machine;
    sm = transition(sm, "VISIBLE", 5000).machine;
    sm = transition(sm, "STARTED", 6000).machine;
    // Skip FIRST_QUARTILE and MIDPOINT, go to THIRD_QUARTILE
    sm = transition(sm, "THIRD_QUARTILE", 7000).machine;

    const skipped = getSkippedStates(sm.history);
    expect(skipped).toContain("FIRST_QUARTILE");
    expect(skipped).toContain("MIDPOINT");
  });

  it("calculates progress correctly", () => {
    let sm = createStateMachine("creative-1");
    expect(getProgress(sm)).toBe(0); // NOT_REQUESTED

    sm = transition(sm, "REQUESTED", 1000).machine;
    expect(getProgress(sm)).toBe(10); // 1/10

    sm = transition(sm, "RESPONSE_RECEIVED", 2000).machine;
    sm = transition(sm, "SCHEDULED", 3000).machine;
    sm = transition(sm, "RENDERED", 4000).machine;
    sm = transition(sm, "VISIBLE", 5000).machine;
    sm = transition(sm, "STARTED", 6000).machine;
    sm = transition(sm, "FIRST_QUARTILE", 7000).machine;
    sm = transition(sm, "MIDPOINT", 8000).machine;
    sm = transition(sm, "THIRD_QUARTILE", 9000).machine;
    sm = transition(sm, "COMPLETE", 10000).machine;
    expect(getProgress(sm)).toBe(100);
  });
});
