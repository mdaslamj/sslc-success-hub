import type {
  ScoreProjectionOutput,
  StudentLearningProfile,
  Subject,
  TargetGapOutput,
} from "@/types/aura-engine-contracts";
import { runAllEngines } from "@/engines/pipeline";
import { applyExecutionDeltas } from "@/core/academic-state/executionEngine";
import type { ExecutionDelta, PlannerTaskSnapshot } from "@/core/academic-state/executionEngine";
import { computeTrajectoryShift } from "@/core/academic-state/trajectoryEngine";
import { computeBurnoutSnapshot } from "@/core/academic-state/burnoutEngine";
import { computeSubjectMasteryView } from "@/core/academic-state/masteryEngine";
import { computeProbabilitySnapshot } from "@/core/academic-state/probabilityEngine";

export type SubjectExecutionView = {
  id: Subject;
  label: string;
  mastery: number;
  predicted: number;
  delta: number;
  color: string;
};

export type AcademicExecutionSnapshot = {
  readiness: number;
  targetScore: number;
  gap: number;
  gapBefore: number;
  trajectoryShift: number;
  subjects: SubjectExecutionView[];
  probability: number;
  burnout: { risk: string; score: number; recommendation: string };
  projection: ScoreProjectionOutput;
  target: TargetGapOutput;
  lastImpact: ExecutionDelta | null;
};

const SUBJECT_META: Record<Subject, { label: string; color: string }> = {
  math: { label: "Mathematics", color: "#FBBF24" },
  science: { label: "Science", color: "#38BDF8" },
  social: { label: "Social Science", color: "#4ADE80" },
};

export function buildAcademicExecutionSnapshot(
  profile: StudentLearningProfile,
  tasks: PlannerTaskSnapshot[],
  previousGap?: number,
): AcademicExecutionSnapshot {
  const execution = applyExecutionDeltas(profile, tasks);
  const adjustedProfile = execution.profile;
  const engines = runAllEngines(adjustedProfile);

  const projection = engines.projection;
  const target = engines.target;
  const readiness = projection.percentage;
  const targetScore = profile.student.targetScore;
  const gap = Math.max(0, targetScore - readiness);
  const gapBefore = previousGap ?? gap + execution.totalReadinessDelta;

  const masteryView = computeSubjectMasteryView(adjustedProfile.chapterMastery, projection);
  const subjects: SubjectExecutionView[] = (["math", "science", "social"] as Subject[]).map(
    (id) => ({
      id,
      label: SUBJECT_META[id].label,
      color: SUBJECT_META[id].color,
      mastery: masteryView[id].mastery,
      predicted: masteryView[id].predicted,
      delta: execution.subjectMasteryDelta[id] ?? 0,
    }),
  );

  const trajectoryShift = computeTrajectoryShift(
    execution.totalReadinessDelta,
    execution.completedCount,
  );
  const probability = computeProbabilitySnapshot(targetScore, readiness, masteryView.overall);
  const burnout = computeBurnoutSnapshot(engines.burnout);

  return {
    readiness,
    targetScore,
    gap,
    gapBefore,
    trajectoryShift,
    subjects,
    probability,
    burnout,
    projection,
    target,
    lastImpact: execution.lastImpact,
  };
}
