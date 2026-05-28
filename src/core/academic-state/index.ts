export {
  buildAcademicExecutionSnapshot,
  type AcademicExecutionSnapshot,
  type SubjectExecutionView,
} from "@/core/academic-state/academicState";
export {
  applyExecutionDeltas,
  computeTaskImpact,
  mapTaskSubjectToEngine,
  type PlannerTaskSnapshot,
  type ExecutionDelta,
} from "@/core/academic-state/executionEngine";
export { computeSubjectMasteryView } from "@/core/academic-state/masteryEngine";
export type {
  AdaptiveAcademicState,
  CausalityChain,
  MasterySession,
  SessionCompletionResult,
} from "@/core/academic-state/masteryEngine";
export {
  processPlannerTaskCompletion,
  buildAdaptiveStateFromProfile,
  type PlannerCompletionResult,
} from "@/core/academic-state/plannerCompletionAdapter";
export {
  buildConstellationView,
  type ConstellationView,
  type ConstellationSubjectView,
} from "@/core/academic-state/constellationView";
export { computeProbabilitySnapshot } from "@/core/academic-state/probabilityEngine";
export { computeBurnoutSnapshot } from "@/core/academic-state/burnoutEngine";
export { computeTrajectoryShift } from "@/core/academic-state/trajectoryEngine";
export { useAcademicExecution } from "@/core/academic-state/useAcademicExecution";
