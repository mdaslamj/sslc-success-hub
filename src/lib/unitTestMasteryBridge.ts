import { mapTaskSubjectToEngine } from "@/core/academic-state/executionEngine";
import type { NewSessionInput } from "@/engines/sessionLogger";
import {
  applyAppendSession,
  applyUpdateMastery,
  readCloudProfile,
  stripProfileStorage,
  syncProfileToFirestore,
  type AuraProfileStorage,
} from "@/hooks/useStudentProfile";
import {
  COLLECTIONS,
  SCHOOL_SUBCOLLECTIONS,
} from "@/integrations/firebase/config";
import type {
  MarkGapType,
  ProcessedUnitTestResult,
  UnitTestSource,
} from "@/types/school";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

export interface MarkSubmission {
  studentUid: string;
  schoolId: string;
  testId: string;
  subjectId: string;
  chapterId: string;
  scoredMarks: number;
  totalMarks: number;
  questionBreakdown?: Array<{
    questionId: string;
    scored: number;
    total: number;
    chapterId?: string;
  }>;
  source: UnitTestSource;
  date: string;
  rollNumber?: string;
}

export interface MarkProcessingResult {
  studentUid: string;
  chapterId: string;
  previousMastery: number;
  newMastery: number;
  delta: number;
  sessionAppended: boolean;
  planUpdated: boolean;
}

const DEFAULT_MASTERY = 50;
const REPLAN_MASTERY_DELTA = 3;
const DEFAULT_UNIT_TEST_DURATION_MIN = 45;

export function scorePercentFromMarks(scoredMarks: number, totalMarks: number): number {
  if (totalMarks <= 0) return 0;
  return Math.round((scoredMarks / totalMarks) * 100);
}

/** Compute new mastery from test score — 70% existing + 30% new evidence. */
export function computeMasteryFromMarks(
  currentMastery: number,
  scoredMarks: number,
  totalMarks: number,
): number {
  if (totalMarks === 0) return currentMastery;
  const scorePercent = (scoredMarks / totalMarks) * 100;
  const newMastery = Math.round(currentMastery * 0.7 + scorePercent * 0.3);
  return Math.min(100, Math.max(0, newMastery));
}

/** Infer gap type from question breakdown until question metadata is available. */
export function inferGapType(
  breakdown: MarkSubmission["questionBreakdown"],
): MarkGapType {
  if (!breakdown || breakdown.length === 0) return "none";

  const missedRatio =
    breakdown.filter((q) => q.scored < q.total * 0.5).length / breakdown.length;

  if (missedRatio > 0.6) return "conceptual";
  if (missedRatio > 0.3) return "procedural";
  if (missedRatio > 0) return "expression";
  return "none";
}

export function getChapterMasteryFromProfile(
  profile: StudentLearningProfile | null | undefined,
  subjectId: string,
  chapterId: string,
): number {
  const engineSubject = mapTaskSubjectToEngine(subjectId);
  if (!engineSubject || !profile) return DEFAULT_MASTERY;
  return profile.chapterMastery[engineSubject]?.[chapterId]?.mastery ?? DEFAULT_MASTERY;
}

export function buildUnitTestSessionInput(
  submission: MarkSubmission,
  scorePercent: number,
): NewSessionInput | null {
  const engineSubject = mapTaskSubjectToEngine(submission.subjectId);
  if (!engineSubject) return null;

  return {
    date: submission.date,
    subject: engineSubject,
    chapter: submission.chapterId,
    durationMinutes: DEFAULT_UNIT_TEST_DURATION_MIN,
    questionsAttempted: submission.totalMarks,
    questionsCorrect: submission.scoredMarks,
    score: scorePercent,
    hintsUsed: 0,
    retriesOnWrong: 0,
    completedPlan: true,
    panicSignal: false,
    engineType: "timed_test",
  };
}

function questionMarksFromBreakdown(
  breakdown: MarkSubmission["questionBreakdown"],
): Record<string, number> {
  if (!breakdown?.length) return {};
  return Object.fromEntries(breakdown.map((q) => [q.questionId, q.scored]));
}

/** Pure profile update used by import flows that already hold Aura storage. */
export function applyMarkSubmissionToStorage(
  stored: AuraProfileStorage,
  submission: MarkSubmission,
): { stored: AuraProfileStorage; result: MarkProcessingResult } {
  const engineSubject = mapTaskSubjectToEngine(submission.subjectId);
  const { profile } = stripProfileStorage(stored);
  const currentMastery = getChapterMasteryFromProfile(
    profile,
    submission.subjectId,
    submission.chapterId,
  );
  const newMastery = computeMasteryFromMarks(
    currentMastery,
    submission.scoredMarks,
    submission.totalMarks,
  );
  const delta = newMastery - currentMastery;
  const scorePercent = scorePercentFromMarks(
    submission.scoredMarks,
    submission.totalMarks,
  );

  let nextStored = stored;
  let sessionAppended = false;

  if (engineSubject) {
    const sessionInput = buildUnitTestSessionInput(submission, scorePercent);
    if (sessionInput) {
      nextStored = applyAppendSession(stored, sessionInput);
      nextStored = applyUpdateMastery(
        nextStored,
        engineSubject,
        submission.chapterId,
        newMastery,
      );
      sessionAppended = true;
    }
  }

  return {
    stored: nextStored,
    result: {
      studentUid: submission.studentUid,
      chapterId: submission.chapterId,
      previousMastery: currentMastery,
      newMastery,
      delta,
      sessionAppended,
      planUpdated: Math.abs(delta) >= REPLAN_MASTERY_DELTA,
    },
  };
}

export async function saveUnitTestResultDoc(
  submission: MarkSubmission,
  processing: Pick<
    MarkProcessingResult,
    "previousMastery" | "newMastery" | "delta"
  > & {
    masteryUpdateApplied: boolean;
    gapType?: MarkGapType;
  },
): Promise<void> {
  const [{ doc, setDoc }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/integrations/firebase/config"),
  ]);

  const scorePercent = scorePercentFromMarks(
    submission.scoredMarks,
    submission.totalMarks,
  );
  const gapType = processing.gapType ?? inferGapType(submission.questionBreakdown);

  const payload: ProcessedUnitTestResult = {
    studentId: submission.studentUid,
    schoolId: submission.schoolId,
    rollNumber: submission.rollNumber,
    totalMarks: submission.totalMarks,
    scoredMarks: submission.scoredMarks,
    questionMarks: questionMarksFromBreakdown(submission.questionBreakdown),
    submittedAt: new Date().toISOString(),
    masteryUpdateApplied: processing.masteryUpdateApplied,
    chapterId: submission.chapterId,
    subjectId: submission.subjectId,
    scorePercent,
    gapType,
    previousMastery: processing.previousMastery,
    newMastery: processing.newMastery,
    delta: processing.delta,
    source: submission.source,
  };

  await setDoc(
    doc(
      db,
      COLLECTIONS.UNIT_TEST_RESULTS,
      submission.testId,
      SCHOOL_SUBCOLLECTIONS.RESULTS,
      submission.studentUid,
    ),
    payload,
    { merge: true },
  );
}

/** Process a single student mark submission with injected profile mutators. */
export async function processMarkSubmission(
  submission: MarkSubmission,
  updateMastery: (chapterId: string, mastery: number) => void,
  appendSession: (session: NewSessionInput) => void,
  currentProfile: StudentLearningProfile | null,
): Promise<MarkProcessingResult> {
  const currentMastery = getChapterMasteryFromProfile(
    currentProfile,
    submission.subjectId,
    submission.chapterId,
  );
  const newMastery = computeMasteryFromMarks(
    currentMastery,
    submission.scoredMarks,
    submission.totalMarks,
  );
  const delta = newMastery - currentMastery;
  const scorePercent = scorePercentFromMarks(
    submission.scoredMarks,
    submission.totalMarks,
  );
  const sessionInput = buildUnitTestSessionInput(submission, scorePercent);
  let sessionAppended = false;

  if (sessionInput) {
    updateMastery(submission.chapterId, newMastery);
    appendSession(sessionInput);
    sessionAppended = true;
  }

  const gapType = inferGapType(submission.questionBreakdown);

  await saveUnitTestResultDoc(submission, {
    previousMastery: currentMastery,
    newMastery,
    delta,
    gapType,
    masteryUpdateApplied: sessionAppended,
  });

  return {
    studentUid: submission.studentUid,
    chapterId: submission.chapterId,
    previousMastery: currentMastery,
    newMastery,
    delta,
    sessionAppended,
    planUpdated: Math.abs(delta) >= REPLAN_MASTERY_DELTA,
  };
}

export type MarkSubmissionBatchHandlers = {
  getProfile: (studentUid: string) => StudentLearningProfile | null;
  updateMastery: (studentUid: string, chapterId: string, mastery: number) => void;
  appendSession: (studentUid: string, session: NewSessionInput) => void;
};

/** Batch entry point for CSV / roster-driven imports. */
export async function processMarkSubmissionBatch(
  submissions: MarkSubmission[],
  handlers: MarkSubmissionBatchHandlers,
): Promise<MarkProcessingResult[]> {
  return Promise.all(
    submissions.map((submission) =>
      processMarkSubmission(
        submission,
        (chapterId, mastery) =>
          handlers.updateMastery(submission.studentUid, chapterId, mastery),
        (session) => handlers.appendSession(submission.studentUid, session),
        handlers.getProfile(submission.studentUid),
      ),
    ),
  );
}

export type RunMarkSubmissionPipelineOptions = {
  profileStorage?: AuraProfileStorage;
  /** When true, writes updated profile to Firestore for the signed-in student. */
  persistProfile?: boolean;
};

/**
 * High-level pipeline for all mark import methods.
 * Loads cloud profile when storage is omitted, persists unit test results,
 * and optionally syncs mastery back to academic_profiles.
 */
export async function runMarkSubmissionPipeline(
  submission: MarkSubmission,
  options: RunMarkSubmissionPipelineOptions = {},
): Promise<{ result: MarkProcessingResult; updatedStorage?: AuraProfileStorage }> {
  let storage = options.profileStorage ?? null;

  if (!storage) {
    const cloud = await readCloudProfile(submission.studentUid);
    storage = cloud?.profile ?? null;
  }

  let result: MarkProcessingResult;
  let updatedStorage: AuraProfileStorage | undefined;

  if (storage) {
    const applied = applyMarkSubmissionToStorage(storage, submission);
    updatedStorage = applied.stored;
    result = applied.result;
    await saveUnitTestResultDoc(submission, {
      previousMastery: result.previousMastery,
      newMastery: result.newMastery,
      delta: result.delta,
      gapType: inferGapType(submission.questionBreakdown),
      masteryUpdateApplied: result.sessionAppended,
    });
  } else {
    result = await processMarkSubmission(
      submission,
      () => {},
      () => {},
      null,
    );
  }

  if (updatedStorage && options.persistProfile) {
    await syncProfileToFirestore(updatedStorage, new Date().toISOString());
  }

  return { result, updatedStorage };
}
