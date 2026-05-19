import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import {
  BOARD_READINESS_SUBCOLLECTIONS,
  COLLECTIONS,
  db,
} from "../config";
import type { ExamSimulationDoc } from "../types";

const COL = BOARD_READINESS_SUBCOLLECTIONS.EXAM_SIMULATIONS;

function simCol(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COL);
}
function simDoc(userId: string, id: string) {
  return doc(db, COLLECTIONS.USERS, userId, COL, id);
}

export async function createExamSimulation(
  data: Omit<ExamSimulationDoc, "id">,
): Promise<ExamSimulationDoc> {
  const ref = doc(simCol(data.userId));
  const full: ExamSimulationDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

export async function saveExamSimulation(
  sim: ExamSimulationDoc,
): Promise<void> {
  await setDoc(
    simDoc(sim.userId, sim.id),
    { ...sim, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function fetchExamSimulation(
  userId: string,
  id: string,
): Promise<ExamSimulationDoc | null> {
  const snap = await getDoc(simDoc(userId, id));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<ExamSimulationDoc, "id">) })
    : null;
}

export async function listExamSimulations(
  userId: string,
): Promise<ExamSimulationDoc[]> {
  const snap = await getDocs(
    query(simCol(userId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ExamSimulationDoc, "id">),
  }));
}

export async function deleteExamSimulation(
  userId: string,
  id: string,
): Promise<void> {
  await deleteDoc(simDoc(userId, id));
}