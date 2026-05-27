import type {
  ChapterMasteryEntry,
  SessionRecord,
  StudentLearningProfile,
  Subject,
  Trend,
} from "@/types/aura-engine-contracts";

const MIN_MASTERY = 0;
const MAX_MASTERY = 100;

export type NewSessionInput = Omit<SessionRecord, "id"> & { id?: string };

function clampMastery(value: number): number {
  return Math.max(MIN_MASTERY, Math.min(MAX_MASTERY, Math.round(value)));
}

function deriveSessionScore(session: NewSessionInput): number {
  if (session.score !== null) return session.score;
  if (session.questionsAttempted <= 0) return 0;
  return Math.round((session.questionsCorrect / session.questionsAttempted) * 100);
}

function deriveTrend(previous: number, next: number): Trend {
  if (next - previous >= 3) return "improving";
  if (previous - next >= 3) return "declining";
  return "stable";
}

/**
 * Update chapter mastery from a completed session score.
 * Uses EMA so one session nudges mastery without wild swings.
 */
export function updateChapterMasteryEntry(
  entry: ChapterMasteryEntry | undefined,
  session: NewSessionInput,
): ChapterMasteryEntry {
  const sessionScore = deriveSessionScore(session);
  const previousMastery = entry?.mastery ?? sessionScore;
  const weight = session.engineType === "recovery" ? 0.4 : 0.3;
  const nextMastery = clampMastery(previousMastery * (1 - weight) + sessionScore * weight);

  return {
    mastery: nextMastery,
    trend: deriveTrend(previousMastery, nextMastery),
    lastPracticed: session.date,
    attemptCount: (entry?.attemptCount ?? 0) + 1,
  };
}

export function createSessionId(existing: SessionRecord[]): string {
  const max = existing.reduce((acc, session) => {
    const match = session.id.match(/sess_(\d+)/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `sess_${String(max + 1).padStart(3, "0")}`;
}

export function appendSessionToProfile(
  profile: StudentLearningProfile,
  input: NewSessionInput,
): StudentLearningProfile {
  const session: SessionRecord = {
    ...input,
    id: input.id ?? createSessionId(profile.sessionHistory),
  };

  const nextHistory = [...profile.sessionHistory, session];
  const nextMastery = { ...profile.chapterMastery };

  if (session.subject && session.chapter && isPracticeSession(session)) {
    const subject = session.subject as Subject;
    const subjectMastery = { ...(nextMastery[subject] ?? {}) };
    subjectMastery[session.chapter] = updateChapterMasteryEntry(
      subjectMastery[session.chapter],
      session,
    );
    nextMastery[subject] = subjectMastery;
  }

  return {
    ...profile,
    sessionHistory: nextHistory,
    chapterMastery: nextMastery,
  };
}

function isPracticeSession(session: SessionRecord | NewSessionInput): boolean {
  return session.questionsAttempted > 0;
}

export function buildPracticeSessionInput(params: {
  date: string;
  subject: Subject;
  chapter: string;
  durationMinutes: number;
  questionsAttempted: number;
  questionsCorrect: number;
  hintsUsed?: number;
  retriesOnWrong?: number;
  completedPlan?: boolean;
  panicSignal?: boolean;
  engineType?: SessionRecord["engineType"];
}): NewSessionInput {
  const score = Math.round((params.questionsCorrect / params.questionsAttempted) * 100);
  return {
    date: params.date,
    subject: params.subject,
    chapter: params.chapter,
    durationMinutes: params.durationMinutes,
    questionsAttempted: params.questionsAttempted,
    questionsCorrect: params.questionsCorrect,
    score,
    hintsUsed: params.hintsUsed ?? 0,
    retriesOnWrong: params.retriesOnWrong ?? 0,
    completedPlan: params.completedPlan ?? true,
    panicSignal: params.panicSignal ?? false,
    engineType: params.engineType ?? "adaptive",
  };
}
