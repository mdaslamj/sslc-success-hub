import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MathCommonMistakeDoc } from "../types";

export async function fetchMathCommonMistakesForChapter(
  chapterId: string,
): Promise<MathCommonMistakeDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MATH_COMMON_MISTAKES),
      where("chapterId", "==", chapterId),
    ),
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<MathCommonMistakeDoc, "id">) }),
  );
}

export async function upsertMathCommonMistake(
  m: MathCommonMistakeDoc,
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_COMMON_MISTAKES, m.id), {
    ...m,
    updatedAt: Date.now(),
  });
}