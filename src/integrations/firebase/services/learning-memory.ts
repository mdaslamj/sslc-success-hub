/**
 * Firestore services for the Continuous Learning Memory + Tutoring Continuity
 * Engine. All six collections live as subcollections under users/{uid} and are
 * owner-gated by Firestore Security Rules.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, LEARNING_MEMORY_SUBCOLLECTIONS, db } from "../config";
import type {
  ConceptConfidenceDoc,
  LearningProfileDoc,
  LearningTimelineDoc,
  MistakeMemoryDoc,
  ScanHistoryDoc,
  TutoringPreferencesDoc,
} from "../types";

const SUB = LEARNING_MEMORY_SUBCOLLECTIONS;

function userCol(uid: string, sub: string) {
  return collection(db, COLLECTIONS.USERS, uid, sub);
}
function userDoc(uid: string, sub: string, id: string) {
  return doc(db, COLLECTIONS.USERS, uid, sub, id);
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as T;
}

// ---------- Learning profile (singleton: doc id == "profile") ----------

export async function fetchLearningProfile(
  uid: string,
): Promise<LearningProfileDoc | null> {
  const snap = await getDoc(userDoc(uid, SUB.LEARNING_PROFILE, "profile"));
  return snap.exists() ? (snap.data() as LearningProfileDoc) : null;
}

export async function upsertLearningProfile(
  profile: LearningProfileDoc,
): Promise<void> {
  await setDoc(
    userDoc(profile.userId, SUB.LEARNING_PROFILE, "profile"),
    clean({ ...profile, lastUpdatedAt: Date.now() }),
    { merge: true },
  );
}

// ---------- Tutoring preferences (singleton: doc id == "preferences") ----------

export async function fetchTutoringPreferences(
  uid: string,
): Promise<TutoringPreferencesDoc | null> {
  const snap = await getDoc(
    userDoc(uid, SUB.TUTORING_PREFERENCES, "preferences"),
  );
  return snap.exists() ? (snap.data() as TutoringPreferencesDoc) : null;
}

export async function upsertTutoringPreferences(
  prefs: TutoringPreferencesDoc,
): Promise<void> {
  await setDoc(
    userDoc(prefs.userId, SUB.TUTORING_PREFERENCES, "preferences"),
    clean({ ...prefs, updatedAt: Date.now() }),
    { merge: true },
  );
}

// ---------- Mistake memory ----------

export async function fetchMistakeMemory(
  uid: string,
  id: string,
): Promise<MistakeMemoryDoc | null> {
  const snap = await getDoc(userDoc(uid, SUB.MISTAKE_MEMORY, id));
  return snap.exists() ? (snap.data() as MistakeMemoryDoc) : null;
}

export async function fetchAllMistakeMemory(
  uid: string,
  limit = 100,
): Promise<MistakeMemoryDoc[]> {
  const q = query(
    userCol(uid, SUB.MISTAKE_MEMORY),
    orderBy("lastSeenAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MistakeMemoryDoc);
}

export async function saveMistakeMemory(
  m: MistakeMemoryDoc,
): Promise<void> {
  await setDoc(userDoc(m.userId, SUB.MISTAKE_MEMORY, m.id), clean({ ...m }), {
    merge: true,
  });
}

// ---------- Learning timeline ----------

export async function appendLearningTimeline(
  e: LearningTimelineDoc,
): Promise<void> {
  await setDoc(userDoc(e.userId, SUB.LEARNING_TIMELINE, e.id), clean({ ...e }));
}

export async function fetchRecentTimeline(
  uid: string,
  limit = 30,
): Promise<LearningTimelineDoc[]> {
  const q = query(
    userCol(uid, SUB.LEARNING_TIMELINE),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LearningTimelineDoc);
}

// ---------- Scan history (compact mirror) ----------

export async function upsertScanHistory(h: ScanHistoryDoc): Promise<void> {
  await setDoc(userDoc(h.userId, SUB.SCAN_HISTORY, h.id), clean({ ...h }), {
    merge: true,
  });
}

export async function fetchScanHistory(
  uid: string,
  limit = 30,
): Promise<ScanHistoryDoc[]> {
  const q = query(
    userCol(uid, SUB.SCAN_HISTORY),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ScanHistoryDoc);
}

export async function fetchScanHistoryByChapter(
  uid: string,
  chapterId: string,
  limit = 10,
): Promise<ScanHistoryDoc[]> {
  const q = query(
    userCol(uid, SUB.SCAN_HISTORY),
    where("chapterId", "==", chapterId),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ScanHistoryDoc);
}

// ---------- Concept confidence ----------

export async function fetchConceptConfidence(
  uid: string,
  conceptKey: string,
): Promise<ConceptConfidenceDoc | null> {
  const snap = await getDoc(userDoc(uid, SUB.CONCEPT_CONFIDENCE, conceptKey));
  return snap.exists() ? (snap.data() as ConceptConfidenceDoc) : null;
}

export async function fetchAllConceptConfidence(
  uid: string,
  limit = 200,
): Promise<ConceptConfidenceDoc[]> {
  const q = query(
    userCol(uid, SUB.CONCEPT_CONFIDENCE),
    orderBy("lastSeenAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ConceptConfidenceDoc);
}

export async function saveConceptConfidence(
  c: ConceptConfidenceDoc,
): Promise<void> {
  await setDoc(userDoc(c.userId, SUB.CONCEPT_CONFIDENCE, c.id), clean({ ...c }), {
    merge: true,
  });
}