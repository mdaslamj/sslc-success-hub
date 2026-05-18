import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { NoteDoc } from "../types";

/**
 * Fetch notes for a subject (optionally filtered by chapter), scoped to the
 * given user. The `userId` filter is required so the query matches the
 * Firestore rules which restrict reads to the owning user.
 */
export async function fetchNotes(
  userId: string,
  subjectId: string,
  chapterId?: string,
): Promise<NoteDoc[]> {
  const base = collection(db, COLLECTIONS.NOTES);
  const q = chapterId
    ? query(
        base,
        where("userId", "==", userId),
        where("subjectId", "==", subjectId),
        where("chapterId", "==", chapterId),
      )
    : query(base, where("userId", "==", userId), where("subjectId", "==", subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NoteDoc, "id">) }));
}

/** Upsert a note. The note's `userId` must match the signed-in user. */
export async function upsertNote(note: NoteDoc): Promise<NoteDoc> {
  const payload: Omit<NoteDoc, "id"> = {
    userId: note.userId,
    subjectId: note.subjectId,
    chapterId: note.chapterId,
    title: note.title,
    body: note.body,
    updatedAt: note.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.NOTES, note.id), payload, { merge: true });
  return { id: note.id, ...payload };
}