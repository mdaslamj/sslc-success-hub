// Firestore document shapes. Keep these aligned with the seeder and rules.

export type SubjectDoc = {
  id: string;
  name: string;
  nameKn?: string;
  emoji: string;
  color: string;
  completion: number;
  mastery: number;
  target: number;
  predicted: number;
  chaptersTotal: number;
  chaptersDone: number;
  weakTopics: string[];
  strongTopics: string[];
  order: number;
};

export type ChapterDoc = {
  id: string;
  subjectId: string;
  title: string;
  titleKn?: string;
  progress: number;
  done: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  order: number;
  // Syllabus metadata (optional — set via admin import)
  chapterName?: string;
  chapterNumber?: number;
  textbookUrl?: string;
  notesUrl?: string;
  worksheetUrl?: string;
  videoUrls?: string[];
  mcqCount?: number;
  estimatedStudyTime?: number; // minutes
  importantTopics?: string[];
  formulas?: { label: string; expression: string; description?: string }[];
  learningObjectives?: string[];
};

/** Generic study resource (textbook PDF, notes, worksheet, video) for a chapter. */
export type ResourceDoc = {
  id: string;
  subjectId: string;
  chapterId: string;
  kind: "textbook" | "notes" | "worksheet" | "video" | "other";
  title: string;
  url: string;
  order?: number;
};

export type UserDoc = {
  uid: string;
  displayName?: string;
  email?: string;
  createdAt: number;
};

export type ProgressDoc = {
  userId: string;
  subjectId: string;
  chapterId?: string;
  progress: number;
  updatedAt: number;
};

/**
 * Per-user, per-chapter progress. Document id convention: `${userId}_${chapterId}`
 * so writes are idempotent and reads by user+chapter are O(1).
 */
export type ChapterProgressDoc = {
  id: string;
  userId: string;
  subjectId: string;
  chapterId: string;
  progress: number; // 0..100
  done: boolean;
  lastStudiedAt: number;
  notes?: string;
};

/** Future MCQ shape — one document per question, scoped to subject+chapter. */
export type McqDoc = {
  id: string;
  subjectId: string;
  chapterId?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  order?: number;
};

/** Future note shape — markdown body keyed by subject+chapter. */
export type NoteDoc = {
  id: string;
  userId: string;
  subjectId: string;
  chapterId?: string;
  title: string;
  body: string;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Analytics & progress tracking
// ---------------------------------------------------------------------------

/**
 * Aggregate per-user progress snapshot. One doc per user, id = userId.
 * Updated incrementally by analytics aggregator. Source of truth for the
 * dashboard's "at-a-glance" stats so we never recompute from raw events
 * on every page load.
 */
export type UserProgressDoc = {
  id: string; // == userId
  userId: string;
  totalChaptersCompleted: number;
  totalStudyMinutes: number;
  totalFocusSessions: number;
  currentStreak: number;
  longestStreak: number;
  lastStudiedAt: number | null;
  /** Per-subject roll-up: subjectId -> { completion %, chapters done, minutes }. */
  subjects: Record<
    string,
    {
      chaptersDone: number;
      chaptersTotal: number;
      completion: number; // 0..100
      minutes: number;
    }
  >;
  updatedAt: number;
};

/**
 * A single study session — either a focus-timer block or a chapter study
 * interval. One doc per session. Flat collection keyed by docId, owner-gated.
 */
export type StudySessionDoc = {
  id: string;
  userId: string;
  subjectId?: string;
  chapterId?: string;
  kind: "focus" | "chapter" | "revision" | "mcq";
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms. */
  endedAt: number;
  durationMinutes: number;
  /** Local YYYY-MM-DD — denormalized for cheap day-bucket queries. */
  dayKey: string;
  notes?: string;
};

/**
 * Unlocked achievement / badge. Owner-gated. Reserved for future
 * gamification + leaderboard.
 */
export type AchievementDoc = {
  id: string;
  userId: string;
  code: string; // stable identifier, e.g. "streak_7", "first_chapter"
  title: string;
  description?: string;
  unlockedAt: number;
  icon?: string;
};

/**
 * Per-user unlocked achievement record. Doc id convention: `${userId}_${code}`.
 * Separate from the public `achievements` catalog so leaderboards can scan
 * unlocks without exposing the catalog definitions.
 */
export type UserAchievementDoc = {
  id: string;
  userId: string;
  code: string;
  unlockedAt: number;
  xpAwarded: number;
  /** Snapshot of the metric that triggered the unlock (e.g. streak length). */
  snapshot?: Record<string, number | string>;
};

/**
 * Per-user streak ledger. One doc per user, id = userId. Updated by the
 * achievements engine on every session log so future cron jobs / leaderboards
 * can read streaks without recomputing from session history.
 */
export type StreakDoc = {
  id: string; // == userId
  userId: string;
  current: number;
  longest: number;
  lastDayKey: string | null; // YYYY-MM-DD
  updatedAt: number;
};

/**
 * Pre-computed daily analytics rollup. One doc per (userId, dayKey).
 * Powers weekly/monthly charts without scanning every session.
 * Doc id convention: `${userId}_${dayKey}`.
 */
export type AnalyticsDailyDoc = {
  id: string;
  userId: string;
  dayKey: string; // YYYY-MM-DD
  studyMinutes: number;
  focusSessions: number;
  chaptersCompleted: number;
  /** Per-subject minute breakdown for the day. */
  bySubject: Record<string, number>;
  updatedAt: number;
};