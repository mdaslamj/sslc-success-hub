import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";

// Firebase web config — these values are publishable (safe in client code).
// Security is enforced via Firestore Security Rules in the Firebase Console.
// Values come from VITE_FIREBASE_* env vars (set in .env). We intentionally
// do NOT ship hardcoded fallbacks — a stale fallback to a decommissioned
// project would cause silent auth-project mismatches against the server-side
// JWT verifier (which expects FIREBASE_PROJECT_ID). Misconfiguration must
// fail loudly at startup instead.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

function requireEnv(name: string): string {
  const v = env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Set all VITE_FIREBASE_* values to match the active Firebase project.`,
    );
  }
  return v;
}

export const firebaseConfig = {
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("VITE_FIREBASE_APP_ID"),
};

export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(firebaseApp);

// Firebase Storage — lazily initialised so the ~40KB SDK chunk only loads
// when the handwritten-answer upload or account-delete flow is invoked.
// Most sessions never touch storage, so this stays out of the initial bundle.
let _storage: FirebaseStorage | null = null;
export async function getStorageLazy(): Promise<FirebaseStorage> {
  if (_storage) return _storage;
  const { getStorage } = await import("firebase/storage");
  _storage = getStorage(firebaseApp);
  return _storage;
}

// Firebase Auth — persistent sessions across reloads & tabs.
export const auth: Auth = getAuth(firebaseApp);
if (typeof window !== "undefined") {
  // Fire-and-forget; failures fall back to in-memory persistence.
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// Collection name constants — single source of truth.
export const COLLECTIONS = {
  STUDY_GROUPS: "study_groups",
  CLASS_ANALYTICS: "class_analytics",
  PARENT_SHARES: "parent_shares",
  SUBJECTS: "subjects",
  CHAPTERS: "chapters",
  USERS: "users",
  PROGRESS: "progress",
  CHAPTER_PROGRESS: "chapterProgress",
  MCQS: "mcqs",
  NOTES: "notes",
  RESOURCES: "resources",
  USER_PROGRESS: "userProgress",
  STUDY_SESSIONS: "studySessions",
  ACHIEVEMENTS: "achievements",
  USER_ACHIEVEMENTS: "userAchievements",
  STREAKS: "streaks",
  ANALYTICS: "analytics",
  QUIZZES: "quizzes",
  QUIZ_ATTEMPTS: "quizAttempts",
  STUDY_PLANS: "studyPlans",
  PLANNER_TASKS: "plannerTasks",
  REVISION_SCHEDULES: "revisionSchedules",
  RECOMMENDATIONS: "recommendations",
  AI_INSIGHTS: "aiInsights",
  USER_PROFILES: "userProfiles",
  USER_SETTINGS: "userSettings",
  USER_STATS: "userStats",
  MOCK_EXAMS: "mockExams",
  EXAM_ATTEMPTS: "examAttempts",
  EXAM_RESULTS: "examResults",
  // Structured academic content (scalable hybrid: metadata + external links).
  SYLLABUS_CONTENT: "syllabusContent",
  CHAPTER_RESOURCES: "chapterResources",
  TEXTBOOK_LINKS: "textbookLinks",
  CHAPTER_NOTES: "chapterNotes",
  // Centralized digital library — top-level resources (textbooks, PYQs,
  // formula sheets, etc.) that may or may not be tied to a specific chapter.
  LIBRARY_RESOURCES: "libraryResources",
  LIBRARY_CATEGORIES: "libraryCategories",
  // Handwritten answer uploads (scan/photo of student's written answers).
  ANSWER_UPLOADS: "answerUploads",
  ANSWER_ATTEMPTS: "answerAttempts",
  // AI evaluation pipeline (post-OCR) for handwritten answers.
  EVALUATIONS: "evaluations",
  MODEL_ANSWERS: "modelAnswers",
  EVALUATION_RUBRICS: "evaluationRubrics",
  WEAKNESS_REPORTS: "weaknessReports",
  // Mathematics Intelligence System — chapter-wise academic intelligence.
  MATH_CHAPTERS: "mathChapters",
  MATH_QUESTIONS: "mathQuestions",
  MATH_MODEL_ANSWERS: "mathModelAnswers",
  MATH_FORMULAS: "mathFormulas",
  MATH_RUBRICS: "mathRubrics",
  MATH_KEYWORDS: "mathKeywords",
  MATH_COMMON_MISTAKES: "mathCommonMistakes",
  MATH_CHAPTER_ANALYTICS: "mathChapterAnalytics",
  MATH_IMPORT_DRAFTS: "mathImportDrafts",
  // Daily AI Study Engine — owner-gated per-user collections.
  DAILY_PLANS: "dailyPlans",
  DAILY_REFLECTIONS: "dailyReflections",
  MOTIVATION_EVENTS: "motivationEvents",
  // Study Session Experience — owner-gated per-user collections.
  SESSION_RESULTS: "sessionResults",
  SESSION_FEEDBACK: "sessionFeedback",
  REVISION_TRIGGERS: "revisionTriggers",
  // AI Scan & Solve experience.
  SCANS: "scans",
  SOLVED_QUESTIONS: "solvedQuestions",
  AI_EVALUATIONS: "aiEvaluations",
  PRACTICE_RECOMMENDATIONS: "practiceRecommendations",
  // Parent Intelligence Dashboard
  PARENTS: "parents",
  STUDENT_INVITES: "studentInvites",
  PARENT_LINKS: "parentLinks",
  // Teacher Intelligence Dashboard
  TEACHERS: "teachers",
  CLASSES: "classes",
  CLASS_INVITES: "classInvites",
  /** Pre-computed planner WHY strings — doc id `{chapterId}_{level}`. */
  WHY_TEXTS: "why_texts",
} as const;

// Weakness Diagnosis & Adaptive Remediation Engine
// Subcollection paths (stored as templates; do not use directly with doc()):
//   users/{uid}/performance/{recordId}
//   users/{uid}/weaknesses/{chapterId}
//   users/{uid}/remediation/{planId}
//   chapters/{chapterId}/intelligence/summary
export const DIAGNOSIS_SUBCOLLECTIONS = {
  PERFORMANCE: "performance",
  WEAKNESSES: "weaknesses",
  REMEDIATION: "remediation",
  CHAPTER_INTELLIGENCE: "intelligence",
} as const;

// Adaptive Study Planner & Intervention Engine
// All four live as subcollections under users/{uid}.
export const ADAPTIVE_SUBCOLLECTIONS = {
  INTERVENTION_PLANS: "interventionPlans",
  ADAPTIVE_SCHEDULES: "adaptiveSchedules",
  REVISION_QUEUE: "revisionQueue",
  REMEDIATION_SESSIONS: "remediationSessions",
  MEMORY_TRACKING: "memoryTracking",
} as const;

// GPT/Gemini Semantic Reasoning Layer
// All four live as subcollections under users/{uid}.
export const SEMANTIC_SUBCOLLECTIONS = {
  AI_TUTORING_SESSIONS: "aiTutoringSessions",
  SEMANTIC_EVALUATIONS: "semanticEvaluations",
  HINT_HISTORY: "hintHistory",
  REASONING_FEEDBACK: "reasoningFeedback",
} as const;

// Board Readiness Prediction + Exam Simulation Engine
// Per-user subcollections under users/{uid}.
export const BOARD_READINESS_SUBCOLLECTIONS = {
  EXAM_SIMULATIONS: "examSimulations",
  BOARD_READINESS: "boardReadiness",
} as const;

// Continuous Learning Memory + Tutoring Continuity Engine
// All live as subcollections under users/{uid}. Singletons use fixed doc ids
// ("profile", "preferences") so reads stay O(1).
export const LEARNING_MEMORY_SUBCOLLECTIONS = {
  LEARNING_PROFILE: "learningProfile",
  MISTAKE_MEMORY: "mistakeMemory",
  TUTORING_PREFERENCES: "tutoringPreferences",
  LEARNING_TIMELINE: "learningTimeline",
  SCAN_HISTORY: "scanHistory",
  CONCEPT_CONFIDENCE: "conceptConfidence",
} as const;

// Gamification + Student Reward System
// All live under users/{uid}. `levels` is a singleton (doc id "summary").
export const GAMIFICATION_SUBCOLLECTIONS = {
  XP: "xp",
  LEVELS: "levels",
  MISSIONS: "missions",
  STREAKS_LEDGER: "streaks",
  REWARD_HISTORY: "rewardHistory",
} as const;

// Parent Intelligence Dashboard subcollections (under parents/{parentUid}).
export const PARENT_SUBCOLLECTIONS = {
  LINKED_STUDENTS: "linkedStudents",
  ALERTS: "alerts",
  WEEKLY_REPORTS: "weeklyReports",
  ENGAGEMENT_HISTORY: "engagementHistory",
} as const;

// Teacher Intelligence Dashboard subcollections.
// Under teachers/{teacherUid}: a lightweight mirror of classes for quick lists.
// Under classes/{classId}: students, assignments, analytics snapshots, risk alerts, insights.
export const TEACHER_SUBCOLLECTIONS = {
  CLASSES_MIRROR: "classes",
} as const;
export const CLASS_SUBCOLLECTIONS = {
  STUDENTS: "students",
  ASSIGNMENTS: "assignments",
  ANALYTICS: "analytics",
  RISK_ALERTS: "riskAlerts",
  INSIGHTS: "insights",
} as const;

// Voice AI Tutor + Conversational Learning System.
// All subcollections under users/{uid}. `voicePreferences` is a singleton
// (doc id "profile") so reads stay O(1).
export const VOICE_SUBCOLLECTIONS = {
  VOICE_SESSIONS: "voiceSessions",
  CONVERSATIONAL_HISTORY: "conversationalHistory",
  SPOKEN_HINTS: "spokenHints",
  AUDIO_REVISION_HISTORY: "audioRevisionHistory",
  VOICE_PREFERENCES: "voicePreferences",
} as const;

// Board Exam Hall Mode + Full Simulation Engine.
// All collections live as subcollections under users/{uid} and are
// owner-gated. Documents persist hall sessions, invigilator events,
// timing analytics, stress patterns, exam strategies, and the
// final board simulation result.
export const EXAM_HALL_SUBCOLLECTIONS = {
  HALL_SESSIONS: "examHallSessions",
  STRATEGIES: "examStrategies",
  INVIGILATOR_EVENTS: "invigilatorEvents",
  TIMING_ANALYTICS: "timingAnalytics",
  STRESS_PATTERNS: "stressPatterns",
  SIMULATION_RESULTS: "boardSimulationResults",
} as const;