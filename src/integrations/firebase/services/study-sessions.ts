import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as qLimit,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { StudySessionDoc } from "../types";

/** Append a study session. Returns the persisted doc. */
export async function logStudySession(
  input: Omit<StudySessionDoc, "id">,
): Promise<StudySessionDoc> {
  const ref = await addDoc(collection(db, COLLECTIONS.STUDY_SESSIONS), input);
  return { id: ref.id, ...input };
}

/** Fetch a user's recent sessions (default: 200, newest first). */
export async function fetchRecentSessions(
  userId: string,
  limit = 200,
): Promise<StudySessionDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.STUDY_SESSIONS),
    where("userId", "==", userId),
    orderBy("startedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudySessionDoc, "id">) }));
}