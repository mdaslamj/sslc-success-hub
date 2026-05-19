import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MathKeywordDoc } from "../types";

export async function fetchMathKeywords(): Promise<MathKeywordDoc[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.MATH_KEYWORDS));
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<MathKeywordDoc, "id">) }),
  );
}

export async function fetchMathKeywordsForChapter(
  chapterId: string,
): Promise<MathKeywordDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MATH_KEYWORDS),
      where("chapterIds", "array-contains", chapterId),
    ),
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<MathKeywordDoc, "id">) }),
  );
}

/** Match a text blob against a keyword set. */
export function matchKeywords(
  text: string,
  keywords: MathKeywordDoc[],
): { matched: MathKeywordDoc[]; missing: MathKeywordDoc[] } {
  const haystack = text.toLowerCase();
  const matched: MathKeywordDoc[] = [];
  const missing: MathKeywordDoc[] = [];
  for (const kw of keywords) {
    const terms = [kw.term, ...kw.synonyms].map((t) => t.toLowerCase());
    const hit = terms.some((t) => haystack.includes(t));
    (hit ? matched : missing).push(kw);
  }
  return { matched, missing };
}

export async function upsertMathKeyword(k: MathKeywordDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_KEYWORDS, k.id), {
    ...k,
    updatedAt: Date.now(),
  });
}