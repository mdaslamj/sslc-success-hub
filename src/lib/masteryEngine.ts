import {
  buildAdaptiveStateFromProfile,
  type PlannerSubjectSeed,
} from "@/core/academic-state/plannerCompletionAdapter";
import {
  enrichCausalityChain,
  generateReplanSummary,
  processSessionCompletion,
  type AdaptiveAcademicState,
  type CausalityChain,
  type MasterySession,
} from "@/core/academic-state/masteryEngine";
import { mapTaskSubjectToEngine } from "@/core/academic-state/executionEngine";
import { resolveProfileChapterKey } from "@/lib/chapter-profile-key";
import { chapterKeysMatch } from "@/lib/normalizeChapterKey";
import type { PlannerEngineChapter } from "@/lib/taskPriorityEngine";
import type { NewSessionInput } from "@/engines/sessionLogger";
import type {
  BurnoutOutput,
  StudentLearningProfile,
  Subject,
} from "@/types/aura-engine-contracts";
import type {
  MockExamAnswer,
  MockExamDoc,
  MockExamResultDoc,
} from "@/integrations/firebase/types";

export type MockExamSectionScore = {
  chapterId: string;
  subjectId?: string;
  scored: number;
  total: number;
};

export type MockExamResultInput = {
  examId: string;
  subjectId: string;
  totalMarks: number;
  scoredMarks: number;
  sectionScores: MockExamSectionScore[];
  /** Duration in minutes. */
  duration: number;
};

export type MockExamChapterUpdate = {
  engineSubject: Subject;
  profileChapterKey: string;
  catalogChapterId: string;
  newChapterMastery: number;
};

export type MockExamProcessResult = {
  chapterUpdates: MockExamChapterUpdate[];
  sessionInput: NewSessionInput;
  causalityChain: CausalityChain;
  needsReplan: boolean;
  replanSummary: string | null;
};

const ENGINE_SUBJECTS: Subject[] = ["math", "science", "social"];

function isEngineSubject(subjectId: string): subjectId is Subject {
  return ENGINE_SUBJECTS.includes(subjectId as Subject);
}

function findPoolChapter(
  chapterPool: PlannerEngineChapter[],
  chapterId: string,
  subjectId?: string,
): PlannerEngineChapter | null {
  const direct =
    chapterPool.find((ch) => ch.id === chapterId) ??
    chapterPool.find((ch) => chapterKeysMatch(ch.id, chapterId));
  if (direct) return direct;

  if (subjectId) {
    const scoped = chapterPool.filter((ch) => ch.subjectId === subjectId);
    return (
      scoped.find((ch) => chapterKeysMatch(ch.id, chapterId)) ??
      scoped.find((ch) => chapterKeysMatch(ch.title, chapterId)) ??
      null
    );
  }

  return null;
}

/** Aggregate per-chapter marks from graded questions. */
export function buildSectionScoresFromExam(
  exam: MockExamDoc,
  graded: MockExamAnswer[],
): MockExamSectionScore[] {
  const byChapter = new Map<
    string,
    { scored: number; total: number; subjectId?: string }
  >();

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];
    if (!q) continue;
    const chapterId = q.chapterId ?? exam.chapterId ?? exam.subjectId ?? "general";
    const marks = typeof q.marks === "number" && q.marks > 0 ? q.marks : 1;
    const entry = byChapter.get(chapterId) ?? {
      scored: 0,
      total: 0,
      subjectId: q.subjectId,
    };
    entry.total += marks;
    const answer = graded[i];
    if (answer) {
      entry.scored += Math.max(0, answer.marksEarned ?? 0);
    }
    byChapter.set(chapterId, entry);
  }

  if (byChapter.size === 0) {
    // TODO: add chapter-level scoring when exam sections are modeled explicitly.
    const scored = graded.reduce((sum, a) => sum + Math.max(0, a.marksEarned ?? 0), 0);
    return [
      {
        chapterId: exam.chapterId ?? exam.subjectId ?? "general",
        subjectId: exam.subjectId ?? exam.subjects[0],
        scored,
        total: exam.totalMarks,
      },
    ];
  }

  return [...byChapter.entries()].map(([chapterId, value]) => ({
    chapterId,
    subjectId: value.subjectId,
    scored: value.scored,
    total: value.total,
  }));
}

export function buildMockExamResultInput(
  exam: MockExamDoc,
  result: MockExamResultDoc,
  graded: MockExamAnswer[],
): MockExamResultInput {
  const sectionScores = buildSectionScoresFromExam(exam, graded);

  return {
    examId: exam.id,
    subjectId: exam.subjectId ?? exam.subjects[0] ?? sectionScores[0]?.subjectId ?? "",
    totalMarks: result.totalMarks,
    scoredMarks: result.marksScored,
    sectionScores,
    duration: Math.max(1, Math.round(result.durationSeconds / 60)),
  };
}

/**
 * Process a submitted mock exam through the same mastery loop as planner sessions.
 * Updates every chapter section tested and returns profile write payloads.
 */
export function processMockExam(
  mockExamResult: MockExamResultInput,
  profile: StudentLearningProfile,
  subjectSeeds: PlannerSubjectSeed[],
  chapterPool: PlannerEngineChapter[],
  burnoutScore = 0,
  burnout?: BurnoutOutput | null,
): MockExamProcessResult | null {
  const primaryEngineSubject = mapTaskSubjectToEngine(mockExamResult.subjectId);
  if (!primaryEngineSubject && mockExamResult.sectionScores.length === 0) {
    return null;
  }

  let adaptiveState = buildAdaptiveStateFromProfile(
    profile,
    subjectSeeds,
    chapterPool,
  );

  const chapterUpdates: MockExamChapterUpdate[] = [];
  let primaryCompletion: ReturnType<typeof processSessionCompletion> = null;
  let primaryCatalogChapterId = mockExamResult.sectionScores[0]?.chapterId ?? "";
  let primaryEngine: Subject | null = primaryEngineSubject;

  const sectionDuration = Math.max(
    1,
    Math.round(mockExamResult.duration / Math.max(mockExamResult.sectionScores.length, 1)),
  );

  for (const section of mockExamResult.sectionScores) {
    const sectionSubjectId =
      section.subjectId ?? mockExamResult.subjectId ?? primaryEngine ?? "";
    const engineSubject = mapTaskSubjectToEngine(sectionSubjectId);
    if (!engineSubject) continue;

    const poolChapter = findPoolChapter(
      chapterPool,
      section.chapterId,
      engineSubject,
    );
    if (!poolChapter) continue;

    const sectionScore =
      section.total > 0
        ? Math.round((section.scored / section.total) * 100)
        : 0;

    const session: MasterySession = {
      chapterId: poolChapter.id,
      subjectId: engineSubject,
      type: "mock",
      duration: sectionDuration,
      score: sectionScore,
    };

    const completion = processSessionCompletion(
      session,
      adaptiveState,
      burnoutScore,
    );
    if (!completion) continue;

    adaptiveState = applyAdaptiveStateUpdate(adaptiveState, completion);

    const profileChapterKey = resolveProfileChapterKey(
      profile,
      engineSubject,
      poolChapter,
    );

    chapterUpdates.push({
      engineSubject,
      profileChapterKey,
      catalogChapterId: poolChapter.id,
      newChapterMastery: Math.round(completion.updatedChapter.mastery),
    });

    const isPrimary =
      section.chapterId === mockExamResult.sectionScores[0]?.chapterId ||
      poolChapter.id === primaryCatalogChapterId;

    if (!primaryCompletion || isPrimary) {
      primaryCompletion = completion;
      primaryCatalogChapterId = poolChapter.id;
      primaryEngine = engineSubject;
    }
  }

  if (!chapterUpdates.length || !primaryCompletion || !primaryEngine) {
    return null;
  }

  const primaryUpdate =
    chapterUpdates.find((update) => update.catalogChapterId === primaryCatalogChapterId) ??
    chapterUpdates[0];

  const today = new Date().toISOString().slice(0, 10);
  const overallScore =
    mockExamResult.totalMarks > 0
      ? Math.round((mockExamResult.scoredMarks / mockExamResult.totalMarks) * 100)
      : 0;

  const sessionInput: NewSessionInput = {
    date: today,
    subject: primaryEngine,
    chapter: primaryUpdate.profileChapterKey,
    durationMinutes: mockExamResult.duration,
    questionsAttempted: mockExamResult.totalMarks,
    questionsCorrect: mockExamResult.scoredMarks,
    score: overallScore,
    hintsUsed: 0,
    retriesOnWrong: 0,
    completedPlan: true,
    panicSignal: false,
    engineType: "timed_test",
  };

  const replanSummary = primaryCompletion.needsReplan
    ? generateReplanSummary(
        primaryCompletion.updatedSubject.name,
        primaryCompletion.updatedSubject.predicted - primaryCompletion.probabilityDelta,
        primaryCompletion.updatedSubject.predicted,
      )
    : null;

  const causalityChain = enrichCausalityChain(primaryCompletion.causalityChain, {
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
    chapterUpdates,
    sessionInput,
    causalityChain,
    needsReplan: primaryCompletion.needsReplan,
    replanSummary,
  };
}

function applyAdaptiveStateUpdate(
  state: AdaptiveAcademicState,
  completion: NonNullable<ReturnType<typeof processSessionCompletion>>,
): AdaptiveAcademicState {
  return {
    chapters: completion.updatedChapters,
    subjects: {
      ...state.subjects,
      [completion.updatedChapter.subjectId]: completion.updatedSubject,
    },
  };
}
