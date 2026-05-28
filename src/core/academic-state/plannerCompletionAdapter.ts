import type { PlannerEngineChapter } from "@/lib/taskPriorityEngine";
import type { RankedPlannerTask } from "@/lib/taskPriorityEngine";
import { resolveProfileChapterKey } from "@/lib/chapter-profile-key";
import {
  generateReplanSummary,
  processSessionCompletion,
  enrichCausalityChain,
  type AdaptiveAcademicState,
  type MasterySession,
  type MasterySessionType,
  type SessionCompletionResult,
  type CausalityChain,
} from "@/core/academic-state/masteryEngine";
import type { NewSessionInput } from "@/engines/sessionLogger";
import type { BurnoutOutput, StudentLearningProfile, Subject } from "@/types/aura-engine-contracts";
import { mapTaskSubjectToEngine } from "@/core/academic-state/executionEngine";

const ENGINE_SUBJECTS: Subject[] = ["math", "science", "social"];

export type PlannerSubjectSeed = {
  id: string;
  name: string;
  color: string;
  target: number;
  predicted: number;
  mastery?: number;
};

export type PlannerCompletionResult = {
  engineSubject: Subject;
  profileChapterKey: string;
  newChapterMastery: number;
  sessionInput: NewSessionInput;
  completion: SessionCompletionResult;
  causalityChain: CausalityChain;
  replanSummary: string | null;
};

function isEngineSubject(subjectId: string): subjectId is Subject {
  return ENGINE_SUBJECTS.includes(subjectId as Subject);
}

function inferSessionType(taskLabel: string): MasterySessionType {
  if (taskLabel.startsWith("Recover")) return "new-concept";
  if (taskLabel.startsWith("Revise") || taskLabel.startsWith("Quick review")) {
    return "revision";
  }
  return "practice";
}

/** Build Phase-3-compatible state from persisted profile + planner catalog. */
export function buildAdaptiveStateFromProfile(
  profile: StudentLearningProfile,
  subjectSeeds: PlannerSubjectSeed[],
  chapterPool: PlannerEngineChapter[],
): AdaptiveAcademicState {
  const chapters = chapterPool.map((catalogChapter) => {
    const subjectId = catalogChapter.subjectId;
    let mastery = catalogChapter.mastery ?? 50;

    if (isEngineSubject(subjectId)) {
      const profileKey = resolveProfileChapterKey(
        profile,
        subjectId,
        catalogChapter,
      );
      if (profileKey) {
        mastery =
          profile.chapterMastery[subjectId]?.[profileKey]?.mastery ?? mastery;
      }
    }

    return {
      id: catalogChapter.id,
      subjectId: catalogChapter.subjectId,
      name: catalogChapter.title,
      mastery,
      blueprintMarks: catalogChapter.blueprintMarks ?? 4,
    };
  });

  const subjects: AdaptiveAcademicState["subjects"] = {};

  for (const seed of subjectSeeds) {
    if (!isEngineSubject(seed.id)) continue;

    const subjectChapters = chapters.filter((ch) => ch.subjectId === seed.id);
    const totalMarks = subjectChapters.reduce(
      (sum, ch) => sum + ch.blueprintMarks,
      0,
    );
    const weightedMastery =
      totalMarks > 0
        ? parseFloat(
            (
              subjectChapters.reduce(
                (sum, ch) => sum + ch.mastery * ch.blueprintMarks,
                0,
              ) / totalMarks
            ).toFixed(1),
          )
        : (seed.mastery ?? 0);

    subjects[seed.id] = {
      name: seed.name,
      color: seed.color,
      mastery: weightedMastery,
      predicted: seed.predicted,
      totalMarks: totalMarks || 80,
    };
  }

  return { chapters, subjects };
}

function buildPlannerSession(task: RankedPlannerTask): MasterySession {
  return {
    id: String(task.id),
    chapterId: task.chapter.id,
    subjectId: task.subjectId,
    type: inferSessionType(task.task),
    duration: task.durationMin,
  };
}

/**
 * Process a completed planner task against the persisted profile.
 * Returns null when the task is outside the core engine subject scope.
 */
export function processPlannerTaskCompletion(
  task: RankedPlannerTask,
  profile: StudentLearningProfile,
  subjectSeeds: PlannerSubjectSeed[],
  chapterPool: PlannerEngineChapter[],
  burnoutScore = 0,
  burnout?: BurnoutOutput | null,
): PlannerCompletionResult | null {
  const engineSubject = mapTaskSubjectToEngine(task.subject);
  if (!engineSubject || task.chapter.id.startsWith("manual-")) return null;

  const profileChapterKey = resolveProfileChapterKey(
    profile,
    engineSubject,
    task.chapter,
  );

  const adaptiveState = buildAdaptiveStateFromProfile(
    profile,
    subjectSeeds,
    chapterPool,
  );
  const session = buildPlannerSession(task);
  const completion = processSessionCompletion(session, adaptiveState, burnoutScore);
  if (!completion) return null;

  const today = new Date().toISOString().slice(0, 10);
  const sessionInput: NewSessionInput = {
    date: today,
    subject: engineSubject,
    chapter: profileChapterKey,
    durationMinutes: task.durationMin,
    questionsAttempted: 0,
    questionsCorrect: 0,
    score: null,
    hintsUsed: 0,
    retriesOnWrong: 0,
    completedPlan: true,
    panicSignal: false,
    engineType: session.type === "revision" ? "concept_review" : "adaptive",
  };

  const replanSummary = completion.needsReplan
    ? generateReplanSummary(
        completion.updatedSubject.name,
        completion.updatedSubject.predicted - completion.probabilityDelta,
        completion.updatedSubject.predicted,
      )
    : null;

  const causalityChain = enrichCausalityChain(completion.causalityChain, {
    replanSummary,
    burnout: burnout
      ? {
          score: burnoutScore,
          risk: burnout.risk,
          recommendation: burnout.recommendation,
        }
      : undefined,
  });

  return {
    engineSubject,
    profileChapterKey,
    newChapterMastery: Math.round(completion.updatedChapter.mastery),
    sessionInput,
    completion: { ...completion, causalityChain },
    causalityChain,
    replanSummary,
  };
}
