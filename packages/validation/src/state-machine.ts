// Ad Session State Machine
// Tracks per-creative lifecycle transitions with validation

import type { CreativeLifecycleState, StateTransition } from "./model.js";

// Ordered states representing the valid forward-only lifecycle
const LIFECYCLE_ORDER: readonly CreativeLifecycleState[] = [
  "NOT_REQUESTED",
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

// Valid transitions map: from → allowed next states
const VALID_TRANSITIONS: Record<CreativeLifecycleState, readonly CreativeLifecycleState[]> = {
  NOT_REQUESTED: ["REQUESTED"],
  REQUESTED: ["RESPONSE_RECEIVED", "ERROR"],
  RESPONSE_RECEIVED: ["SCHEDULED", "ERROR"],
  SCHEDULED: ["RENDERED", "ERROR", "SKIPPED"],
  RENDERED: ["VISIBLE", "ERROR", "SKIPPED"],
  VISIBLE: ["STARTED", "ERROR", "SKIPPED"],
  STARTED: ["FIRST_QUARTILE", "MIDPOINT", "THIRD_QUARTILE", "COMPLETE", "ERROR", "SKIPPED"],
  FIRST_QUARTILE: ["MIDPOINT", "THIRD_QUARTILE", "COMPLETE", "ERROR", "SKIPPED"],
  MIDPOINT: ["THIRD_QUARTILE", "COMPLETE", "ERROR", "SKIPPED"],
  THIRD_QUARTILE: ["COMPLETE", "ERROR", "SKIPPED"],
  COMPLETE: [], // terminal
  SKIPPED: [], // terminal
  ERROR: [], // terminal
};

export interface TransitionResult {
  readonly valid: boolean;
  readonly transition: StateTransition;
  readonly error?: string;
}

export interface StateMachineInstance {
  readonly creativeId: string;
  readonly currentState: CreativeLifecycleState;
  readonly history: readonly StateTransition[];
  readonly errors: readonly string[];
}

export const createStateMachine = (creativeId: string): StateMachineInstance => ({
  creativeId,
  currentState: "NOT_REQUESTED",
  history: [],
  errors: [],
});

export const transition = (
  machine: StateMachineInstance,
  to: CreativeLifecycleState,
  timestamp: number,
): { machine: StateMachineInstance; result: TransitionResult } => {
  const from = machine.currentState;
  const transitionRecord: StateTransition = { from, to, timestamp };

  // Check if transition is valid
  const allowedNext = VALID_TRANSITIONS[from];
  if (!allowedNext.includes(to)) {
    const error = `Invalid transition: ${from} → ${to} for creative ${machine.creativeId}`;
    return {
      machine: {
        ...machine,
        errors: [...machine.errors, error],
      },
      result: { valid: false, transition: transitionRecord, error },
    };
  }

  // Check timestamp monotonicity
  const lastTransition = machine.history[machine.history.length - 1];
  if (lastTransition && timestamp < lastTransition.timestamp) {
    const error = `Non-monotonic timestamp: ${timestamp} < ${lastTransition.timestamp} for creative ${machine.creativeId}`;
    return {
      machine: {
        ...machine,
        currentState: to,
        history: [...machine.history, transitionRecord],
        errors: [...machine.errors, error],
      },
      result: { valid: false, transition: transitionRecord, error },
    };
  }

  return {
    machine: {
      ...machine,
      currentState: to,
      history: [...machine.history, transitionRecord],
    },
    result: { valid: true, transition: transitionRecord },
  };
};

// Check if a state was skipped in the lifecycle
export const getSkippedStates = (history: readonly StateTransition[]): CreativeLifecycleState[] => {
  if (history.length === 0) return [];

  const visitedStates = new Set<CreativeLifecycleState>();
  visitedStates.add(history[0].from);
  for (const t of history) {
    visitedStates.add(t.to);
  }

  // Only check for skipped states up to the final state reached
  const lastState = history[history.length - 1].to;
  const lastIndex = LIFECYCLE_ORDER.indexOf(lastState);
  if (lastIndex === -1) return []; // terminal state like ERROR/SKIPPED

  const skipped: CreativeLifecycleState[] = [];
  for (let i = 0; i <= lastIndex; i++) {
    if (!visitedStates.has(LIFECYCLE_ORDER[i])) {
      skipped.push(LIFECYCLE_ORDER[i]);
    }
  }
  return skipped;
};

// Check if the creative completed its full lifecycle
export const isComplete = (machine: StateMachineInstance): boolean => machine.currentState === "COMPLETE";

export const isTerminal = (machine: StateMachineInstance): boolean =>
  machine.currentState === "COMPLETE" || machine.currentState === "SKIPPED" || machine.currentState === "ERROR";

export const hasErrors = (machine: StateMachineInstance): boolean => machine.errors.length > 0;

// Get lifecycle progress as a percentage (0-100)
export const getProgress = (machine: StateMachineInstance): number => {
  const idx = LIFECYCLE_ORDER.indexOf(machine.currentState);
  if (idx === -1) return 0;
  return Math.round((idx / (LIFECYCLE_ORDER.length - 1)) * 100);
};
