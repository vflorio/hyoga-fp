export type {
  AdBreak,
  AdPod,
  AdSession,
  AdSlotRecord,
  Companion,
  Creative,
  CreativeLifecycleState,
  CreativeType,
  NetworkRequest,
  NetworkRequestType,
  StateTransition,
  TimelineEntry,
  TimePositionClass,
  TrackingEvent,
  TrackingEventType,
} from "./model.js";
export { createAdSession } from "./model.js";
export type {
  CorrelationEntry,
  CorrelationResult,
  ParsedTrackingUrl,
} from "./network.js";
export { correlateRequests, parseTrackingUrl, toTrackingEvents } from "./network.js";

export type {
  CoverageEntry,
  CoverageMatrix,
  ValidationReport,
} from "./report.js";
export { buildReport, renderHtmlReport } from "./report.js";

export type {
  PodComparisonResult,
  RuleSeverity,
  RuleViolation,
  ValidationResult,
} from "./rules.js";
export { comparePods, validateSession } from "./rules.js";
export type { StateMachineInstance, TransitionResult } from "./state-machine.js";
export {
  createStateMachine,
  getProgress,
  getSkippedStates,
  hasErrors,
  isComplete,
  isTerminal,
  transition,
} from "./state-machine.js";
