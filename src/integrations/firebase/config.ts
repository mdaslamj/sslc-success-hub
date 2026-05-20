import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";

// Firebase web config — these values are publishable (safe in client code).
// Security is enforced via Firestore Security Rules in the Firebase Console.
export const firebaseConfig = {
  apiKey: "AIzaSyBwzkv0doLXzw2zKkOINOS2zS7IzuybwQM",
  authDomain: "c-success-hub.firebaseapp.com",
  projectId: "c-success-hub",
  storageBucket: "c-success-hub.firebasestorage.app",
  messagingSenderId: "428486835894",
  appId: "1:428486835894:web:f4d422ae1a7a183d34b017",
};

export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(firebaseApp);

// Firebase Storage — used by the handwritten-answer upload feature.
export const storage: FirebaseStorage = getStorage(firebaseApp);

// Firebase Auth — persistent sessions across reloads & tabs.
export const auth: Auth = getAuth(firebaseApp);
if (typeof window !== "undefined") {
  // Fire-and-forget; failures fall back to in-memory persistence.
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// Collection name constants — single source of truth.
export const COLLECTIONS = {
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