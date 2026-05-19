import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MathChapterDoc } from "../types";

/** Fetch all math chapters, ordered by chapterNumber. */
export async function fetchMathChapters(): Promise<MathChapterDoc[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.MATH_CHAPTERS), orderBy("chapterNumber", "asc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MathChapterDoc, "id">) }));
}

export async function fetchMathChapter(
  chapterId: string,
): Promise<MathChapterDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.MATH_CHAPTERS, chapterId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MathChapterDoc, "id">) };
}

/** Chapters ranked by board weight (highest first). */
export async function fetchMathChaptersByWeight(): Promise<MathChapterDoc[]> {
  const chapters = await fetchMathChapters();
  return [...chapters].sort((a, b) => b.boardWeight - a.boardWeight);
}

export async function upsertMathChapter(c: MathChapterDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_CHAPTERS, c.id), {
    ...c,
    updatedAt: Date.now(),
  });
}