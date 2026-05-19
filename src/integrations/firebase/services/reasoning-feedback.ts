import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, SEMANTIC_SUBCOLLECTIONS, db } from "../config";
import type { ReasoningFeedbackDoc } from "../types";

const COL = SEMANTIC_SUBCOLLECTIONS.REASONING_FEEDBACK;
const colRef = (uid: string) => collection(db, COLLECTIONS.USERS, uid, COL);

export async function saveReasoningFeedback(
  f: Omit<ReasoningFeedbackDoc, "id" | "createdAt">,
): Promise<ReasoningFeedbackDoc> {
  const now = Date.now();
  const ref = await addDoc(colRef(f.userId), { ...f, createdAt: now });
  await updateDoc(ref, { id: ref.id });
  return { ...f, id: ref.id, createdAt: now };
}

export async function fetchReasoningFeedbackForChapter(
  userId: string,
  chapterId: string,
): Promise<ReasoningFeedbackDoc[]> {
  const snap = await getDocs(
    query(
      colRef(userId),
      where("chapterId", "==", chapterId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ReasoningFeedbackDoc, "id">),
  }));
}