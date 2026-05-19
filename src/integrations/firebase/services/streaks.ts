import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { StreakDoc } from "../types";

/** Read the persisted streak ledger for a user. */
export async function fetchStreak(userId: string): Promise<StreakDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.STREAKS, userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<StreakDoc, "id">) };
}

/** Upsert the streak ledger. Doc id == userId, idempotent. */
export async function upsertStreak(
  input: Omit<StreakDoc, "id" | "updatedAt"> & { updatedAt?: number },
): Promise<StreakDoc> {
  const payload: Omit<StreakDoc, "id"> = {
    ...input,
    updatedAt: input.updatedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.STREAKS, input.userId), payload, { merge: true });
  return { id: input.userId, ...payload };
}