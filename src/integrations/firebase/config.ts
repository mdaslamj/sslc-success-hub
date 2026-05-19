import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

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
  ANALYTICS: "analytics",
} as const;