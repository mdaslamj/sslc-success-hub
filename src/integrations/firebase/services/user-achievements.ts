import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { UserAchievementDoc } from "../types";

const userAchievementId = (userId: string, code: string) => `${userId}_${code}`;

/** Unlock a user achievement. Idempotent — doc id is deterministic. */
export async function unlockUserAchievement(
  input: Omit<UserAchievementDoc, "id" | "unlockedAt"> & { unlockedAt?: number },
): Promise<UserAchievementDoc> {
  const id = userAchievementId(input.userId, input.code);
  const payload: Omit<UserAchievementDoc, "id"> = {
    ...input,
    unlockedAt: input.unlockedAt ?? Date.now(),
  };
  await setDoc(doc(db, COLLECTIONS.USER_ACHIEVEMENTS, id), payload, { merge: true });
  return { id, ...payload };
}

/** Fetch all unlocked achievements for a user. */
export async function fetchUserAchievements(
  userId: string,
): Promise<UserAchievementDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.USER_ACHIEVEMENTS),
    where("userId", "==", userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UserAchievementDoc, "id">),
  }));
}