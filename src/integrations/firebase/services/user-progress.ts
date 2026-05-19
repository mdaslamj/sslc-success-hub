import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { UserProgressDoc } from "../types";

/** Read the aggregate user-progress snapshot. Null if not yet written. */
export async function fetchUserProgress(userId: string): Promise<UserProgressDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USER_PROGRESS, userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserProgressDoc, "id">) };
}

/** Upsert the aggregate user-progress snapshot. Idempotent — doc id = userId. */
export async function upsertUserProgress(
  input: Omit<UserProgressDoc, "id" | "updatedAt"> & { updatedAt?: number },
): Promise<UserProgressDoc> {
  const payload: Omit<UserProgressDoc, "id"> = {
    ...input,
    updatedAt: input.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.USER_PROGRESS, input.userId), payload, { merge: true });
  return { id: input.userId, ...payload };
}