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
  /** Free-form topic tag — drives weak-topic analytics. */
  topic?: string;
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

// ---------------------------------------------------------------------------
// Quiz engine
// ---------------------------------------------------------------------------

/**
 * Quiz mode. The engine treats all modes uniformly today; future modes plug
 * in extra question-selection / scoring rules without changing the schema.
 *   - practice  : untimed, answer-review, no XP cap
 *   - timed     : countdown, auto-submit on expiry
 *   - mock      : full subject mock exam, weighted scoring (future)
 *   - adaptive  : difficulty adjusts per-answer (future)
 *   - ai        : questions generated on-demand by AI gateway (future)
 */
export type QuizMode = "practice" | "timed" | "mock" | "adaptive" | "ai";

/**
 * One question slot inside a quiz. We inline the question payload so an
 * attempt is self-contained — no fan-out reads at play time, and historical
 * attempts stay readable even if the underlying MCQ doc is edited later.
 */
export type QuizQuestionRef = {
  mcqId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
};

/**
 * Canonical quiz definition. Public-read, admin-write. Generated quizzes
 * (AI / adaptive) set `source` accordingly so analytics can split organic
 * vs system attempts.
 */
export type QuizDoc = {
  id: string;
  subjectId: string;
  chapterId?: string;
  title: string;
  description?: string;
  mode: QuizMode;
  /** Seconds; 0 = untimed. */
  durationSeconds: number;
  questions: QuizQuestionRef[];
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  source?: "system" | "user" | "ai";
  /** Optional ordering for catalog listing. */
  order?: number;
  createdAt: number;
};

/** A single answered question inside an attempt. */
export type QuizAnswer = {
  mcqId: string;
  selectedIndex: number | null;
  correct: boolean;
  topic?: string;
  /** Wall-clock ms the user spent on this question. */
  timeMs?: number;
};

/**
 * Per-user quiz attempt. Owner-gated. Used as the source of truth for
 * accuracy, average score, weak topics, and XP awarded from quizzes.
 */
export type QuizAttemptDoc = {
  id: string;
  userId: string;
  quizId: string;
  subjectId: string;
  chapterId?: string;
  mode: QuizMode;
  startedAt: number;
  endedAt: number;
  /** Wall-clock seconds elapsed (pause-aware). */
  durationSeconds: number;
  /** Number answered correctly. */
  score: number;
  total: number;
  /** correct / total, 0..100. */
  accuracy: number;
  /** answered / total, 0..100. */
  completion: number;
  /** Topics where the user answered incorrectly (dedup'd). */
  weakTopics: string[];
  answers: QuizAnswer[];
  xpAwarded: number;
  /** Local YYYY-MM-DD — denormalized for cheap day-bucket queries. */
  dayKey: string;
};

// ---------------------------------------------------------------------------
// Mock exams (full subject, chapter test, mixed, previous-year pattern)
// ---------------------------------------------------------------------------

/**
 * Exam kind drives selection rules, weighting and result framing.
 *   - full      : full-subject mock exam (board-pattern, single subject)
 *   - chapter   : chapter-scoped test (short, focused practice)
 *   - mixed     : multi-subject mixed paper (cross-subject revision)
 *   - previous  : previous-year board pattern simulation
 */
export type MockExamKind = "full" | "chapter" | "mixed" | "previous";

/** One question slot, inlined for attempt-snapshot stability. */
export type MockExamQuestionRef = {
  mcqId: string;
  subjectId: string;
  chapterId?: string;
  topic?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  marks: number;
  difficulty?: "Easy" | "Medium" | "Hard";
};

/**
 * Catalog mock exam definition. Public-read, admin-write. Negative marking
 * is expressed as a fraction of `marks` deducted per wrong answer (0 = off).
 */
export type MockExamDoc = {
  id: string;
  kind: MockExamKind;
  title: string;
  description?: string;
  /** Primary subject (empty for `mixed`). */
  subjectId?: string;
  /** Optional chapter scope (used by `chapter`). */
  chapterId?: string;
  /** Subjects included — used by mixed / full. */
  subjects: string[];
  /** Year tag for previous-year papers, e.g. "2024". */
  year?: string;
  durationSeconds: number;
  totalMarks: number;
  /** 0 = no negative marking, e.g. 0.25 = -1/4 marks per wrong answer. */
  negativeMarkingFactor: number;
  questions: MockExamQuestionRef[];
  /** Optional ordering for catalog listing. */
  order?: number;
  /** Future flag for AI-generated / adaptive papers. */
  source?: "system" | "ai" | "user";
  createdAt: number;
};

/** One answered question inside an exam attempt. */
export type MockExamAnswer = {
  mcqId: string;
  selectedIndex: number | null;
  marked: boolean;
  correct: boolean | null; // null when not graded yet (in-progress)
  /** Marks earned for this question (post-negative-marking). */
  marksEarned: number;
  timeMs?: number;
};

export type MockExamAttemptStatus = "in_progress" | "submitted" | "abandoned";

/**
 * Per-user exam attempt. Owner-gated. Persisted during the exam so the
 * student can resume on another device; finalized on submit / auto-submit.
 */
export type MockExamAttemptDoc = {
  id: string;
  userId: string;
  examId: string;
  kind: MockExamKind;
  status: MockExamAttemptStatus;
  startedAt: number;
  /** Server-side soft deadline (startedAt + durationSeconds*1000). */
  deadlineAt: number;
  endedAt?: number;
  durationSeconds: number;
  /** Snapshot of every answer slot — same length as exam.questions. */
  answers: MockExamAnswer[];
  /** Last viewed question index (for resume). */
  cursor: number;
  updatedAt: number;
};

/**
 * Final result rollup for analytics. Written once on submit. Separate from
 * the attempt so the attempt stays a thin progress record and result reads
 * are cheap on the analytics page.
 */
export type MockExamResultDoc = {
  id: string;
  userId: string;
  attemptId: string;
  examId: string;
  kind: MockExamKind;
  endedAt: number;
  dayKey: string;
  /** Raw marks earned (post negative-marking). */
  marksScored: number;
  totalMarks: number;
  /** marksScored / totalMarks, 0..100. */
  percentage: number;
  /** correct / total, 0..100. */
  accuracy: number;
  /** answered / total, 0..100. */
  completion: number;
  /** Total seconds the student spent. */
  durationSeconds: number;
  /** Per-subject performance. */
  bySubject: Record<
    string,
    {
      correct: number;
      total: number;
      marksScored: number;
      totalMarks: number;
      accuracy: number; // 0..100
    }
  >;
  /** Per-topic correct/total rollup — drives "weak areas". */
  byTopic: Record<string, { correct: number; total: number }>;
  /** Topics where accuracy < 50%. */
  weakAreas: string[];
  /** Avg seconds per question. */
  avgTimePerQuestion: number;
  /** Heuristic predicted board score (0..100). */
  predictedBoardScore: number;
  xpAwarded: number;
};

// ---------------------------------------------------------------------------
// Smart planner & revision engine
// ---------------------------------------------------------------------------

/**
 * Source that produced a planner task. `system` = deterministic engine
 * output, `revision` = surfaced by the spaced-repetition queue, `user` =
 * manually added, `ai` = future LLM-generated.
 */
export type PlannerSource = "system" | "revision" | "user" | "ai";

/** Kind of work a task represents — drives icons, XP, and analytics splits. */
export type PlannerTaskKind =
  | "study"      // read / learn new chapter
  | "revision"   // revisit a previously studied chapter
  | "quiz"       // attempt an MCQ / quiz set
  | "focus"      // pure focus-timer block
  | "practice";  // worksheet / past-paper

export type PlannerTaskStatus = "pending" | "in_progress" | "done" | "skipped";

/**
 * One actionable item on a study plan. Owner-gated. Keyed by `id`; the
 * containing plan is referenced by `planId` + `dayKey` for cheap range reads.
 */
export type PlannerTaskDoc = {
  id: string;
  userId: string;
  planId: string;
  /** Local YYYY-MM-DD the task is scheduled for. */
  dayKey: string;
  /** Optional clock label, e.g. "07:30". */
  startsAt?: string;
  kind: PlannerTaskKind;
  source: PlannerSource;
  title: string;
  subjectId?: string;
  chapterId?: string;
  /** Free-form topic / focus area (drives weak-topic linking). */
  topic?: string;
  /** Planned block length in minutes. */
  durationMinutes: number;
  status: PlannerTaskStatus;
  /** Engine-assigned 0..100 — used to rank / auto-trim a busy day. */
  priority: number;
  /** Human-readable chips ("weak topic", "due for revision", …). */
  reasons?: string[];
  /** XP awarded on completion. */
  xp?: number;
  createdAt: number;
  completedAt?: number | null;
};

/**
 * A generated study plan. One doc per (userId, scope, periodKey). For daily
 * plans the id convention is `${userId}_d_${dayKey}`; weekly is
 * `${userId}_w_${isoWeekKey}` — keeps writes idempotent and reads O(1).
 */
export type StudyPlanDoc = {
  id: string;
  userId: string;
  scope: "daily" | "weekly";
  /** YYYY-MM-DD for daily, YYYY-Www for weekly. */
  periodKey: string;
  /** Total target study minutes for the period. */
  targetMinutes: number;
  /** Sum of task minutes the user has marked done. */
  doneMinutes: number;
  taskIds: string[];
  /** Why this plan looks the way it does (engine explanation). */
  rationale: string[];
  /** Snapshot of inputs that produced the plan (for re-generation diffs). */
  signals: {
    weakSubjectIds: string[];
    overdueRevisions: number;
    streak: number;
    averageQuizAccuracy: number;
    availableMinutes: number;
    examCountdownDays?: number | null;
  };
  source: PlannerSource;
  createdAt: number;
  updatedAt: number;
};

/**
 * Spaced-repetition card. One doc per (userId, chapterId). Uses a lightweight
 * SM-2 derivative — `ease` adjusts on each review, `intervalDays` schedules
 * the next revisit, `dueAt` is the next time the card surfaces in the queue.
 * Future "adaptive" mode can swap the algorithm without changing the doc.
 */
export type RevisionScheduleDoc = {
  id: string; // `${userId}_${chapterId}`
  userId: string;
  subjectId: string;
  chapterId: string;
  chapterTitle?: string;
  /** Number of completed reviews. */
  reps: number;
  /** SM-2 ease factor; clamped to [1.3, 3.0]. */
  ease: number;
  /** Days until next review after last completion. */
  intervalDays: number;
  /** Epoch ms — when this card should next surface. */
  dueAt: number;
  lastReviewedAt: number | null;
  /** Last quality rating, 0 (forgot) → 5 (perfect). */
  lastQuality?: number;
  /** Lapse count — chapters with many lapses are "weak". */
  lapses: number;
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// AI recommendation engine
// ---------------------------------------------------------------------------

/**
 * Why a recommendation surfaced. Drives icons, sorting, and downstream
 * analytics. New rule modules just add a new kind here.
 */
export type RecommendationKind =
  | "next_chapter"
  | "revision_due"
  | "weak_topic"
  | "quiz_suggestion"
  | "focus_boost"
  | "streak_guard"
  | "consistency"
  | "subject_difficulty";

/** Where the recommendation came from. `rule` today; `ai` reserved for
 *  the future generative tutor / adaptive learning path engine. */
export type RecommendationSource = "rule" | "ai" | "hybrid";

export type RecommendationStatus = "active" | "dismissed" | "acted" | "expired";

/**
 * One actionable nudge for the learner. Doc id is deterministic so
 * regenerations are idempotent: `${userId}_${kind}_${targetKey}`.
 */
export type RecommendationDoc = {
  id: string;
  userId: string;
  kind: RecommendationKind;
  source: RecommendationSource;
  title: string;
  body: string;
  /** 0..100 — drives ranking + UI emphasis. */
  score: number;
  /** Human-readable chips ("Accuracy 48%", "3d overdue"). */
  reasons: string[];
  /** Suggested CTA — UI maps `route` to a TanStack `<Link to>`. */
  cta?: {
    label: string;
    route?: string;
    params?: Record<string, string>;
  };
  subjectId?: string;
  chapterId?: string;
  topic?: string;
  /** Snapshot of the signals that produced the score (for explainability). */
  signals?: Record<string, number | string>;
  status: RecommendationStatus;
  createdAt: number;
  /** Epoch ms; engine drops recs whose `expiresAt` has passed. */
  expiresAt?: number | null;
  actedAt?: number | null;
  dismissedAt?: number | null;
};

/**
 * Coarse insight roll-up for the learner — feeds the dashboard "AI Insights"
 * card and the future generative tutor's context window. One doc per
 * (userId, periodKey).
 */
export type AiInsightDoc = {
  id: string;
  userId: string;
  /** YYYY-MM-DD for daily, YYYY-Www for weekly. */
  periodKey: string;
  scope: "daily" | "weekly";
  headline: string;
  bullets: string[];
  metrics: {
    accuracy: number;
    completionPercent: number;
    studyMinutes: number;
    focusSessions: number;
    streak: number;
    revisionBacklog: number;
    weakSubjectCount: number;
  };
  /** Predicted score band — reserved for the predictive-scoring module. */
  predictedScoreBand?: "low" | "mid" | "high";
  source: RecommendationSource;
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Authentication & profile
// ---------------------------------------------------------------------------

export type PreferredLanguage = "en" | "kn" | "bilingual";

/** Per-user profile. Doc id == auth uid. */
export type UserProfileDoc = {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  studentName: string;
  classLevel: string; // e.g. "10", "9"
  targetScore: number; // 0..100
  preferredLanguage: PreferredLanguage;
  weakSubjects: string[]; // subject ids
  studyGoals: string[];
  /** Reserved for future roles (parent, teacher, admin). */
  role: "student" | "parent" | "teacher" | "admin";
  createdAt: number;
  updatedAt: number;
};

/** Per-user app settings. Doc id == auth uid. */
export type UserSettingsDoc = {
  uid: string;
  notifications: {
    revisionReminders: boolean;
    dailyDigest: boolean;
  };
  studyWindow: {
    dailyMinutesTarget: number;
    preferredStartHour: number; // 0..23
  };
  theme: "system" | "light" | "dark";
  updatedAt: number;
};

/** Aggregated per-user stats snapshot. Doc id == auth uid. */
export type UserStatsDoc = {
  uid: string;
  totalXp: number;
  studyMinutes: number;
  quizzesTaken: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  chaptersCompleted: number;
  achievementsUnlocked: number;
  lastActiveAt: number;
  updatedAt: number;
};