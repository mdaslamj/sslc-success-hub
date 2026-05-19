import {
  addDoc,
  collection,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { QuizAttemptDoc } from "../types";

/** Persist a finished attempt. Returns the stored doc. */
export async function logQuizAttempt(
  input: Omit<QuizAttemptDoc, "id">,
): Promise<QuizAttemptDoc> {
  const ref = await addDoc(collection(db, COLLECTIONS.QUIZ_ATTEMPTS), input);
  return { id: ref.id, ...input };
}

/** Fetch a user's most recent attempts (default 100, newest first). */
export async function fetchRecentQuizAttempts(
  userId: string,
  limit = 100,
): Promise<QuizAttemptDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.QUIZ_ATTEMPTS),
    where("userId", "==", userId),
    orderBy("endedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<QuizAttemptDoc, "id">),
  }));
}