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
  kind: ResourceKind;
  title: string;
  url: string;
  order?: number;
};

/**
 * Canonical resource kinds. Drives icons, grouping in the ChapterResources
 * UI, and downstream filtering (e.g. AI tutor "find me PYQs for X").
 */
export type ResourceKind =
  | "textbook"
  | "notes"
  | "worksheet"
  | "video"
  | "pyq"        // previous year question paper
  | "revision"   // revision notes / cheat-sheets
  | "kannada"    // Kannada-medium explanation notes
  | "other";

export type UserDoc = {
  uid: string;
  displayName?: string;
  email?: string;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Structured academic content (hybrid metadata + external links)
// ---------------------------------------------------------------------------

/**
 * Per-chapter syllabus content document. Lightweight metadata only — no
 * embedded PDFs. Doc id == chapterId so reads are O(1) and writes are
 * idempotent. Public-read, admin-write.
 */
export type SyllabusContentDoc = {
  id: string; // == chapterId
  subjectId: string;
  chapterId: string;
  chapterNumber: number;
  chapterName: string;
  chapterNameKn?: string;
  /** Plain-text or markdown summary. Keep <= ~2KB to stay cheap. */
  summary?: string;
  summaryKn?: string;
  importantTopics: string[];
  formulas: { label: string; expression: string; description?: string }[];
  learningObjectives: string[];
  /** Free-form board/standard, e.g. "Karnataka SSLC". */
  board?: string;
  updatedAt: number;
};

/**
 * One link/resource attached to a chapter. Flat collection keyed by
 * deterministic id `${chapterId}__${kind}__${idx}`. Public-read,
 * admin-write. Mirrors `ResourceDoc` but lives in its own collection so
 * the legacy `resources` collection can stay untouched.
 */
export type ChapterResourceDoc = {
  id: string;
  subjectId: string;
  chapterId: string;
  kind: ResourceKind;
  title: string;
  /** External URL (preferred). */
  url: string;
  /** Optional language tag, e.g. "en", "kn". */
  language?: string;
  /** Optional storage path when the file is uploaded (rare; custom notes). */
  storagePath?: string;
  /** Free-form tags so AI tutor can filter (e.g. ["pyq","2024"]). */
  tags?: string[];
  order?: number;
  createdAt: number;
};

/**
 * Official textbook link per chapter. Separate collection so the UI can
 * promote the canonical book without scanning the full resource list.
 * Doc id == chapterId.
 */
export type TextbookLinkDoc = {
  id: string; // == chapterId
  subjectId: string;
  chapterId: string;
  /** "NCERT", "KTBS" (Karnataka Textbook Society), etc. */
  publisher?: string;
  edition?: string;
  language?: string;
  title: string;
  url: string;
  pageStart?: number;
  pageEnd?: number;
  updatedAt: number;
};

/**
 * Curated chapter notes (markdown body OR external URL). Doc id == chapterId.
 * Public-read for the official curated copy. Per-user personal notes still
 * live in the existing `notes` collection (owner-gated).
 */
export type ChapterNoteDoc = {
  id: string; // == chapterId
  subjectId: string;
  chapterId: string;
  title: string;
  /** Inline markdown body for short notes. */
  body?: string;
  /** External URL (PDF / web page) for longer notes. */
  url?: string;
  language?: string;
  /** Optional storage path if uploaded via admin. */
  storagePath?: string;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Library — centralized academic resource hub
// ---------------------------------------------------------------------------

/**
 * High-level category for the digital library. Distinct from `ResourceKind`
 * (used by per-chapter resources) so the library can group by curricular
 * purpose rather than just file type.
 */
export type LibraryCategory =
  | "textbook"
  | "pyq"
  | "notes"
  | "worksheet"
  | "video"
  | "formula"
  | "qbank"
  | "revision";

export type LibraryLanguage = "en" | "kn" | "bilingual";

/**
 * One library item. Either `subjectId` and/or `chapterId` may be omitted to
 * represent subject-wide or globally useful resources (e.g. full textbook,
 * full board paper). Public-read, admin-write.
 */
export type LibraryResourceDoc = {
  id: string;
  title: string;
  titleKn?: string;
  description?: string;
  descriptionKn?: string;
  category: LibraryCategory;
  /** Optional finer-grained type (reuses ResourceKind enum). */
  resourceType?: ResourceKind;
  subjectId?: string;
  chapterId?: string;
  /** External URL (preferred). */
  url?: string;
  /** Optional Firebase Storage path when a PDF is uploaded. */
  pdfPath?: string;
  thumbnailUrl?: string;
  /** Free-form icon hint (lucide icon name). UI falls back to category icon. */
  icon?: string;
  language: LibraryLanguage;
  tags: string[];
  /** Surfaced in the quick-access strip on /resources. */
  isFeatured: boolean;
  /** True for official KTBS / NCERT / board material. */
  isOfficial: boolean;
  /** Year for PYQs / board papers. */
  year?: number;
  /** Lightweight popularity signal. */
  views?: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
};

/**
 * Curated category metadata. Admin-managed; renders the tab strip and the
 * empty-state copy on the library page.
 */
export type LibraryCategoryDoc = {
  id: LibraryCategory;
  label: string;
  labelKn?: string;
  description?: string;
  icon?: string;
  order: number;
};

// ---------------------------------------------------------------------------
// Handwritten answer uploads
// ---------------------------------------------------------------------------

export type AnswerAttemptContextType = "quiz" | "mock" | "chapter" | "freeform";

export type AnswerAttemptContext = {
  type: AnswerAttemptContextType;
  /** Quiz id, mock-exam id, chapter id, etc. Optional for freeform. */
  refId?: string;
  subjectId?: string;
  chapterId?: string;
  /** Optional human-readable label cached for history rendering. */
  label?: string;
};

export type AnswerPreprocessing = {
  rotation: 0 | 90 | 180 | 270;
  brightness: number; // 1 = neutral, range 0.5..1.5
  contrast: number; // 1 = neutral, range 0.5..1.5
  cropped: boolean;
  autoEnhanced: boolean;
};

export type AnswerOcrStatus = "pending" | "queued" | "done" | "skipped" | "error";
export type AnswerEvaluationStatus = "pending" | "queued" | "done" | "skipped" | "error";

/** Per-image review lifecycle for the human-correction step that gates AI grading. */
export type AnswerReviewStatus = "not_required" | "pending" | "in_review" | "approved";

/**
 * Attempt-level processing state — drives history UI (scanning animation,
 * "ready for evaluation" badge, etc.). Independent from per-image OCR status
 * so a multi-page attempt can show a single coherent state.
 */
export type AnswerProcessingState =
  | "uploaded"
  | "processing"
  | "review_required"
  | "ready_for_evaluation"
  | "evaluated";

/** One uploaded image (typically a single page of handwritten answer). */
export type AnswerUploadDoc = {
  id: string;
  userId: string;
  attemptId: string;
  questionId?: string;
  /** Firebase Storage path. */
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  preprocessing: AnswerPreprocessing;
  /**
   * OCR pipeline. `extractedText` is the raw model output; `correctedText`
   * is the student-edited version that AI grading should consume. Keeping
   * both lets us train / audit the OCR layer later.
   */
  ocr: {
    status: AnswerOcrStatus;
    extractedText?: string;
    correctedText?: string;
    /** 0..1, surfaced as a confidence indicator pill. */
    confidence?: number;
    /** Detected language hint — reserved for future bilingual OCR. */
    language?: string;
    /** Bounding-box / word-level data slot — reserved for future heatmap. */
    words?: { text: string; confidence: number }[];
    /** Per-image review status; gates AI evaluation. */
    reviewStatus?: AnswerReviewStatus;
    /** Last error message if status === "error". */
    error?: string;
    updatedAt?: number;
  };
  /** Per-image AI evaluation (future). */
  evaluation: {
    status: AnswerEvaluationStatus;
    score?: number;
    maxScore?: number;
    rubric?: { criterion: string; weight: number; score: number; comment?: string }[];
    feedback?: string;
    updatedAt?: number;
  };
  order: number;
  createdAt: number;
};

/** One submission session — wraps 1..N uploaded images. */
export type AnswerAttemptDoc = {
  id: string;
  userId: string;
  context: AnswerAttemptContext;
  imageIds: string[];
  imageCount: number;
  notes?: string;
  status: "draft" | "submitted" | "evaluated";
  /** Coarse processing state shown in history + review UIs. */
  processingState?: AnswerProcessingState;
  /** Aggregate AI evaluation (future, set once rubric grading runs). */
  aiEvaluation?: {
    totalScore: number;
    maxScore: number;
    summary?: string;
    breakdown?: { questionId?: string; score: number; maxScore: number; feedback?: string }[];
    updatedAt: number;
  };
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
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
  | "subject_difficulty"
  | "resource";

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
  /** Optional emoji avatar selected by the student. */
  avatarEmoji?: string;
  /** Daily study commitment in minutes — used by planner + recommendations. */
  dailyStudyGoalMinutes?: number;
  /** ISO date (YYYY-MM-DD) of the board exam — drives countdown + AI urgency. */
  examTargetDate?: string;
  /** Reserved for future roles (parent, teacher, admin). */
  role: "student" | "parent" | "teacher" | "admin";
  /** Reserved for future parent/teacher linkage. */
  linkedAccounts?: { parents?: string[]; teachers?: string[] };
  createdAt: number;
  updatedAt: number;
};

/** Per-user app settings. Doc id == auth uid. */
export type UserSettingsDoc = {
  uid: string;
  notifications: {
    revisionReminders: boolean;
    dailyDigest: boolean;
    achievementAlerts?: boolean;
    plannerAlerts?: boolean;
  };
  studyWindow: {
    dailyMinutesTarget: number;
    preferredStartHour: number; // 0..23
  };
  /** Local time strings (HH:mm) for scheduled reminders. */
  reminders?: {
    studyReminderTime?: string;   // e.g. "18:00"
    revisionReminderTime?: string;
  };
  /** Focus / Pomodoro timer preferences. */
  focusTimer?: {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakEvery: number; // every N focus sessions
    autoStartBreaks: boolean;
    soundEnabled: boolean;
  };
  /** AI assistant personalization. */
  aiAssistant?: {
    enabled: boolean;
    tone: "friendly" | "concise" | "coach";
    dailyTips: boolean;
    languageHint?: PreferredLanguage;
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

// ---------------------------------------------------------------------------
// AI evaluation pipeline for handwritten answers
//
// Architecture notes:
//  - One `EvaluationDoc` per `AnswerAttemptDoc`. Per-question/per-image
//    breakdowns live inside `perQuestion[]` so a single doc renders the whole
//    summary screen without extra reads.
//  - `ModelAnswerDoc` and `EvaluationRubricDoc` are admin-curated reference
//    data — public read, admin write. They feed the grading prompt (and a
//    future rubric editor) but never store student PII.
//  - `WeaknessReportDoc` is a rolling roll-up keyed by user+subject (and
//    optional chapter) so the analytics + recommendations engines can read a
//    single doc to know what to drill next.
//  - Wire-compatible with a future GPT/Gemini grading call: today the
//    service layer fills these shapes with a heuristic placeholder so the
//    UI is fully exercised. Swapping in real LLM output only touches the
//    `runEvaluation` function.
// ---------------------------------------------------------------------------

export type EvaluationState =
  | "pending"
  | "evaluating"
  | "evaluated"
  | "review_required"
  | "error";

/** Curated model/expected answer for a specific question. Admin-managed. */
export type ModelAnswerDoc = {
  id: string;
  subjectId: string;
  chapterId?: string;
  /** Free-form question id (e.g. quiz qid, exam qid, "ch3-q5"). */
  questionId: string;
  questionText?: string;
  /** Canonical answer text used as the grading reference. */
  answerText: string;
  /** Mark allocation for this question. */
  maxScore: number;
  /** Required keywords/concepts. Drives keyword-detection scoring. */
  keywords: string[];
  /** Step-marking outline — each step awards a portion of maxScore. */
  steps?: { label: string; marks: number; keywords?: string[] }[];
  language?: "en" | "kn" | "bilingual";
  /** Optional rubric override; otherwise the subject/board default applies. */
  rubricId?: string;
  updatedAt: number;
};

/** Reusable marking rubric (board-style). Admin-managed. */
export type EvaluationRubricDoc = {
  id: string;
  name: string;
  /** "Karnataka SSLC", "CBSE", "custom", etc. */
  board?: string;
  subjectId?: string;
  /** Weighted criteria; weights should sum to 1.0. */
  criteria: {
    key: string;
    label: string;
    weight: number;
    description?: string;
  }[];
  /** Default presentation-marks ceiling (handwriting / neatness / diagrams). */
  presentationMaxPct?: number;
  updatedAt: number;
};

export type EvaluationSeverity = "low" | "medium" | "high";

export type EvaluationPerQuestion = {
  questionId?: string;
  /** Source image id this question was extracted from (if known). */
  imageId?: string;
  questionText?: string;
  studentAnswer: string;
  score: number;
  maxScore: number;
  /** Rubric criterion -> score (0..weight). */
  rubric: {
    key: string;
    label: string;
    weight: number;
    score: number;
    comment?: string;
  }[];
  /** Keywords from the model answer that were detected in the student text. */
  matchedKeywords: string[];
  /** Keywords/concepts the student missed. */
  missingKeywords: string[];
  strengths: string[];
  mistakes: string[];
  missingPoints: string[];
  presentationFeedback?: string;
  conceptualFeedback?: string;
  improvementSuggestions: string[];
};

/** One evaluation per AnswerAttemptDoc. Doc id == attemptId. */
export type EvaluationDoc = {
  id: string; // == attemptId
  attemptId: string;
  userId: string;
  subjectId?: string;
  chapterId?: string;
  state: EvaluationState;
  /** Aggregate marks. */
  totalScore: number;
  maxScore: number;
  percentage: number;
  /** Top-level summary text rendered above the breakdown. */
  summary?: string;
  /** Roll-up of strengths/mistakes across all questions. */
  strengths: string[];
  mistakes: string[];
  missingPoints: string[];
  improvementSuggestions: string[];
  presentationFeedback?: string;
  conceptualFeedback?: string;
  /** Detected weak concepts — feeds WeaknessReportDoc + recommendations. */
  weakConcepts: { topic: string; severity: EvaluationSeverity }[];
  perQuestion: EvaluationPerQuestion[];
  /** Provider hint for future telemetry ("heuristic" today). */
  engine: "heuristic" | "gpt" | "gemini" | "manual";
  rubricId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Per-user rolling weakness report. Doc id convention:
 *   `${userId}_${subjectId}`  (chapter-wide rollup) or
 *   `${userId}_${subjectId}_${chapterId}`  (chapter-specific).
 * The recommendation/analytics engines read this instead of scanning every
 * evaluation.
 */
export type WeaknessReportDoc = {
  id: string;
  userId: string;
  subjectId: string;
  chapterId?: string;
  /** Topic -> aggregated frequency + worst severity seen. */
  topics: {
    topic: string;
    occurrences: number;
    severity: EvaluationSeverity;
    lastSeenAt: number;
  }[];
  /** Rolling average score on this subject/chapter from handwritten answers. */
  avgPercentage: number;
  sampleSize: number;
  updatedAt: number;
};