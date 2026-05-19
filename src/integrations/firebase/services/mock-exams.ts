import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  MockExamAttemptDoc,
  MockExamDoc,
  MockExamResultDoc,
} from "../types";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** Fetch all mock exams (public read). Falls back to seed if collection is empty. */
export async function fetchMockExams(): Promise<MockExamDoc[]> {
  const q = query(collection(db, COLLECTIONS.MOCK_EXAMS), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MockExamDoc, "id">) }));
}

export async function fetchMockExam(examId: string): Promise<MockExamDoc | null> {
  const ref = doc(db, COLLECTIONS.MOCK_EXAMS, examId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MockExamDoc, "id">) };
}

// ---------------------------------------------------------------------------
// Attempts (in-progress + finished)
// ---------------------------------------------------------------------------

export async function startExamAttempt(
  input: Omit<MockExamAttemptDoc, "id">,
): Promise<MockExamAttemptDoc> {
  const ref = await addDoc(collection(db, COLLECTIONS.EXAM_ATTEMPTS), input);
  return { id: ref.id, ...input };
}

/** Patch an in-progress attempt (answers, cursor, updatedAt). */
export async function saveExamAttemptProgress(
  attemptId: string,
  patch: Partial<Pick<MockExamAttemptDoc, "answers" | "cursor" | "status" | "endedAt">>,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.EXAM_ATTEMPTS, attemptId);
  await updateDoc(ref, { ...patch, updatedAt: Date.now() });
}

export async function fetchExamAttempt(
  attemptId: string,
): Promise<MockExamAttemptDoc | null> {
  const ref = doc(db, COLLECTIONS.EXAM_ATTEMPTS, attemptId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MockExamAttemptDoc, "id">) };
}

/** Newest finished attempts for a user (default 20). */
export async function fetchRecentExamAttempts(
  userId: string,
  limit = 20,
): Promise<MockExamAttemptDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.EXAM_ATTEMPTS),
    where("userId", "==", userId),
    where("status", "==", "submitted"),
    orderBy("endedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MockExamAttemptDoc, "id">),
  }));
}

// ---------------------------------------------------------------------------
// Results (analytics snapshot — one per attempt)
// ---------------------------------------------------------------------------

export async function saveExamResult(input: MockExamResultDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.EXAM_RESULTS, input.id);
  await setDoc(ref, input, { merge: true });
}

export async function fetchExamResult(id: string): Promise<MockExamResultDoc | null> {
  const ref = doc(db, COLLECTIONS.EXAM_RESULTS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as MockExamResultDoc;
}

export async function fetchRecentExamResults(
  userId: string,
  limit = 20,
): Promise<MockExamResultDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.EXAM_RESULTS),
    where("userId", "==", userId),
    orderBy("endedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MockExamResultDoc);
}