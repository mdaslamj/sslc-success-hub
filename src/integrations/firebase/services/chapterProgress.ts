import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { ChapterProgressDoc } from "../types";

const progressId = (userId: string, chapterId: string) => `${userId}_${chapterId}`;

/** Read a single user's progress on a chapter. */
export async function fetchChapterProgress(
  userId: string,
  chapterId: string,
): Promise<ChapterProgressDoc | null> {
  const ref = doc(db, COLLECTIONS.CHAPTER_PROGRESS, progressId(userId, chapterId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ChapterProgressDoc, "id">) };
}

/** Read all chapter progress entries for a user inside a subject. */
export async function fetchSubjectProgress(
  userId: string,
  subjectId: string,
): Promise<ChapterProgressDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.CHAPTER_PROGRESS),
    where("userId", "==", userId),
    where("subjectId", "==", subjectId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChapterProgressDoc, "id">) }));
}

/** Upsert chapter progress. Idempotent — keyed on `${userId}_${chapterId}`. */
export async function upsertChapterProgress(
  input: Omit<ChapterProgressDoc, "id" | "lastStudiedAt"> & { lastStudiedAt?: number },
): Promise<ChapterProgressDoc> {
  const id = progressId(input.userId, input.chapterId);
  const payload: Omit<ChapterProgressDoc, "id"> = {
    userId: input.userId,
    subjectId: input.subjectId,
    chapterId: input.chapterId,
    progress: input.progress,
    done: input.done,
    lastStudiedAt: input.lastStudiedAt ?? Date.now(),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
  await setDoc(doc(db, COLLECTIONS.CHAPTER_PROGRESS, id), payload, { merge: true });
  return { id, ...payload };
}