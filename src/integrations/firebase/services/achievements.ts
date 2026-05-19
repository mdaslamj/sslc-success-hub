import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { AchievementDoc } from "../types";

const achievementId = (userId: string, code: string) => `${userId}_${code}`;

/** Unlock (or re-unlock; idempotent) an achievement for a user. */
export async function unlockAchievement(
  input: Omit<AchievementDoc, "id" | "unlockedAt"> & { unlockedAt?: number },
): Promise<AchievementDoc> {
  const id = achievementId(input.userId, input.code);
  const payload: Omit<AchievementDoc, "id"> = {
    ...input,
    unlockedAt: input.unlockedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.ACHIEVEMENTS, id), payload, { merge: true });
  return { id, ...payload };
}

/** Fetch all unlocked achievements for a user. */
export async function fetchAchievements(userId: string): Promise<AchievementDoc[]> {
  const q = query(collection(db, COLLECTIONS.ACHIEVEMENTS), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AchievementDoc, "id">) }));
}