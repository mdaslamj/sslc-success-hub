import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { McqDoc } from "../types";

/** Fetch MCQs for a subject (optionally filtered by chapter). */
export async function fetchMcqs(
  subjectId: string,
  chapterId?: string,
): Promise<McqDoc[]> {
  const base = collection(db, COLLECTIONS.MCQS);
  const q = chapterId
    ? query(base, where("subjectId", "==", subjectId), where("chapterId", "==", chapterId), orderBy("order", "asc"))
    : query(base, where("subjectId", "==", subjectId), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McqDoc, "id">) }));
}