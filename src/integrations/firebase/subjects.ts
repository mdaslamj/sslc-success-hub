import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "./config";
import type { ChapterDoc, SubjectDoc } from "./types";

/** Fetch all subjects, ordered by `order` field. */
export async function fetchSubjects(): Promise<SubjectDoc[]> {
  const q = query(collection(db, COLLECTIONS.SUBJECTS), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubjectDoc, "id">) }));
}

/** Fetch a single subject by id. Returns null if not found. */
export async function fetchSubject(subjectId: string): Promise<SubjectDoc | null> {
  const ref = doc(db, COLLECTIONS.SUBJECTS, subjectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SubjectDoc, "id">) };
}

/** Fetch all chapters for a given subject, ordered. */
export async function fetchChapters(subjectId: string): Promise<ChapterDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.CHAPTERS),
    where("subjectId", "==", subjectId),
    orderBy("order", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChapterDoc, "id">) }));
}