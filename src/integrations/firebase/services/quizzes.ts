import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { QuizDoc } from "../types";

/** Fetch a single quiz definition by id. */
export async function fetchQuiz(quizId: string): Promise<QuizDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.QUIZZES, quizId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<QuizDoc, "id">) };
}

/** List quizzes for a subject (optionally filtered by chapter). */
export async function fetchQuizzes(
  subjectId: string,
  chapterId?: string,
): Promise<QuizDoc[]> {
  const base = collection(db, COLLECTIONS.QUIZZES);
  const q = chapterId
    ? query(
        base,
        where("subjectId", "==", subjectId),
        where("chapterId", "==", chapterId),
        orderBy("order", "asc"),
      )
    : query(base, where("subjectId", "==", subjectId), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuizDoc, "id">) }));
}

/** Admin-only: upsert a canonical quiz definition. */
export async function upsertQuiz(quiz: QuizDoc): Promise<QuizDoc> {
  const { id, ...payload } = quiz;
  await setDoc(doc(db, COLLECTIONS.QUIZZES, id), payload, { merge: true });
  return quiz;
}