import { addDoc, collection, getDocs, limit as qLimit, orderBy, query, where } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { MotivationEventDoc } from "../types";

export async function logMotivationEvent(
  input: Omit<MotivationEventDoc, "id">,
): Promise<MotivationEventDoc> {
  const ref = await addDoc(collection(db, COLLECTIONS.MOTIVATION_EVENTS), input);
  return { id: ref.id, ...input };
}

export async function fetchRecentMotivationEvents(
  userId: string,
  limit = 20,
): Promise<MotivationEventDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.MOTIVATION_EVENTS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MotivationEventDoc, "id">) }));
}