import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MathModelAnswerDoc } from "../types";

export async function fetchMathModelAnswer(
  questionId: string,
): Promise<MathModelAnswerDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.MATH_MODEL_ANSWERS, questionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MathModelAnswerDoc, "id">) };
}

export async function upsertMathModelAnswer(
  m: MathModelAnswerDoc,
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_MODEL_ANSWERS, m.id), {
    ...m,
    updatedAt: Date.now(),
  });
}