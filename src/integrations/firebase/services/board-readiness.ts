import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import {
  BOARD_READINESS_SUBCOLLECTIONS,
  COLLECTIONS,
  db,
} from "../config";
import type { BoardReadinessDoc } from "../types";

const COL = BOARD_READINESS_SUBCOLLECTIONS.BOARD_READINESS;

function brCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}
function brDoc(userId: string, id: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, id);
}

export async function saveBoardReadiness(
  data: Omit<BoardReadinessDoc, "id"> & { id?: string },
): Promise<BoardReadinessDoc> {
  const ref = data.id ? brDoc(data.userId, data.id) : doc(brCol(data.userId));
  const full: BoardReadinessDoc = {
    ...data,
    id: ref.id,
    updatedAt: Date.now(),
  };
  await setDoc(ref, full, { merge: true });
  return full;
}

export async function fetchLatestBoardReadiness(
  userId: string,
): Promise<BoardReadinessDoc | null> {
  const snap = await getDocs(
    query(brCol(userId), orderBy("predictionDate", "desc"), limit(1)),
  );
  const d = snap.docs[0];
  return d
    ? ({ id: d.id, ...(d.data() as Omit<BoardReadinessDoc, "id">) })
    : null;
}

export async function fetchBoardReadiness(
  userId: string,
  id: string,
): Promise<BoardReadinessDoc | null> {
  const snap = await getDoc(brDoc(userId, id));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<BoardReadinessDoc, "id">) })
    : null;
}

export async function listBoardReadiness(
  userId: string,
  max = 20,
): Promise<BoardReadinessDoc[]> {
  const snap = await getDocs(
    query(brCol(userId), orderBy("predictionDate", "desc"), limit(max)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<BoardReadinessDoc, "id">),
  }));
}