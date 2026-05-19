import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { COLLECTIONS, DIAGNOSIS_SUBCOLLECTIONS, db } from "../config";
import type { WeaknessProfileDoc } from "../types";

function weaknessDoc(userId: string, chapterId: string) {
  return doc(
    db,
    COLLECTIONS.USERS,
    userId,
    DIAGNOSIS_SUBCOLLECTIONS.WEAKNESSES,
    chapterId,
  );
}

export async function fetchWeaknessProfile(
  userId: string,
  chapterId: string,
): Promise<WeaknessProfileDoc | null> {
  const snap = await getDoc(weaknessDoc(userId, chapterId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<WeaknessProfileDoc, "id">) };
}

export async function fetchAllWeaknessProfiles(
  userId: string,
): Promise<WeaknessProfileDoc[]> {
  const snap = await getDocs(
    collection(db, COLLECTIONS.USERS, userId, DIAGNOSIS_SUBCOLLECTIONS.WEAKNESSES),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WeaknessProfileDoc, "id">),
  }));
}

export async function saveWeaknessProfile(
  profile: WeaknessProfileDoc,
): Promise<void> {
  await setDoc(
    weaknessDoc(profile.userId, profile.chapterId),
    { ...profile, lastUpdated: Date.now() },
    { merge: true },
  );
}