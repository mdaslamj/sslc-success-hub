import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, SEMANTIC_SUBCOLLECTIONS, db } from "../config";
import type { HintHistoryDoc } from "../types";

const COL = SEMANTIC_SUBCOLLECTIONS.HINT_HISTORY;
const colRef = (uid: string) => collection(db, COLLECTIONS.USERS, uid, COL);

export async function saveHint(
  h: Omit<HintHistoryDoc, "id" | "createdAt">,
): Promise<HintHistoryDoc> {
  const now = Date.now();
  const ref = await addDoc(colRef(h.userId), { ...h, createdAt: now });
  await updateDoc(ref, { id: ref.id });
  return { ...h, id: ref.id, createdAt: now };
}

export async function markHintRevealed(
  userId: string,
  hintId: string,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.USERS, userId, COL, hintId),
    { revealed: true },
    { merge: true },
  );
}

export async function fetchHintsForQuestion(
  userId: string,
  questionId: string,
): Promise<HintHistoryDoc[]> {
  const snap = await getDocs(
    query(
      colRef(userId),
      where("questionId", "==", questionId),
      orderBy("createdAt", "asc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<HintHistoryDoc, "id">),
  }));
}