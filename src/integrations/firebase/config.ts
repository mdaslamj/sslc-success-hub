import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
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
} as const;