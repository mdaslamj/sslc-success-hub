import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, EXAM_HALL_SUBCOLLECTIONS, db } from "../config";
import type {
  BoardSimulationResultDoc,
  ExamHallSessionDoc,
  ExamStrategyDoc,
  InvigilatorEventDoc,
  StressPatternDoc,
  TimingAnalyticsDoc,
} from "../types";

const SUB = EXAM_HALL_SUBCOLLECTIONS;

function sub(uid: string, name: string) {
  return collection(db, COLLECTIONS.USERS, uid, name);
}
function subDoc(uid: string, name: string, id: string) {
  return doc(db, COLLECTIONS.USERS, uid, name, id);
}

// --- Hall sessions ---------------------------------------------------------

export async function createHallSession(
  data: Omit<ExamHallSessionDoc, "id">,
): Promise<ExamHallSessionDoc> {
  const ref = doc(sub(data.userId, SUB.HALL_SESSIONS));
  const full: ExamHallSessionDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

export async function saveHallSession(s: ExamHallSessionDoc): Promise<void> {
  await setDoc(
    subDoc(s.userId, SUB.HALL_SESSIONS, s.id),
    { ...s, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function fetchHallSession(
  uid: string,
  id: string,
): Promise<ExamHallSessionDoc | null> {
  const snap = await getDoc(subDoc(uid, SUB.HALL_SESSIONS, id));
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as Omit<ExamHallSessionDoc, "id">) })
    : null;
}

export async function listHallSessions(
  uid: string,
  limit = 20,
): Promise<ExamHallSessionDoc[]> {
  const snap = await getDocs(
    query(sub(uid, SUB.HALL_SESSIONS), orderBy("createdAt", "desc"), qLimit(limit)),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ExamHallSessionDoc, "id">),
  }));
}

export async function deleteHallSession(uid: string, id: string): Promise<void> {
  await deleteDoc(subDoc(uid, SUB.HALL_SESSIONS, id));
}

// --- Strategy --------------------------------------------------------------

export async function saveExamStrategy(
  data: Omit<ExamStrategyDoc, "id">,
): Promise<ExamStrategyDoc> {
  const ref = doc(sub(data.userId, SUB.STRATEGIES));
  const full: ExamStrategyDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

export async function fetchStrategyForSession(
  uid: string,
  sessionId: string,
): Promise<ExamStrategyDoc | null> {
  const snap = await getDocs(
    query(sub(uid, SUB.STRATEGIES), where("sessionId", "==", sessionId), qLimit(1)),
  );
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...(d.data() as Omit<ExamStrategyDoc, "id">) }) : null;
}

// --- Invigilator events ----------------------------------------------------

export async function pushInvigilatorEvent(
  data: Omit<InvigilatorEventDoc, "id">,
): Promise<InvigilatorEventDoc> {
  const ref = doc(sub(data.userId, SUB.INVIGILATOR_EVENTS));
  const full: InvigilatorEventDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

export async function listInvigilatorEvents(
  uid: string,
  sessionId: string,
): Promise<InvigilatorEventDoc[]> {
  const snap = await getDocs(
    query(
      sub(uid, SUB.INVIGILATOR_EVENTS),
      where("sessionId", "==", sessionId),
      orderBy("createdAt", "asc"),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<InvigilatorEventDoc, "id">),
  }));
}

// --- Timing analytics ------------------------------------------------------

export async function saveTimingAnalytics(
  data: Omit<TimingAnalyticsDoc, "id">,
): Promise<TimingAnalyticsDoc> {
  const ref = doc(sub(data.userId, SUB.TIMING_ANALYTICS));
  const full: TimingAnalyticsDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

// --- Stress patterns -------------------------------------------------------

export async function saveStressPattern(
  data: Omit<StressPatternDoc, "id">,
): Promise<StressPatternDoc> {
  const ref = doc(sub(data.userId, SUB.STRESS_PATTERNS));
  const full: StressPatternDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

// --- Simulation results ----------------------------------------------------

export async function saveSimulationResult(
  data: Omit<BoardSimulationResultDoc, "id">,
): Promise<BoardSimulationResultDoc> {
  const ref = doc(sub(data.userId, SUB.SIMULATION_RESULTS));
  const full: BoardSimulationResultDoc = { ...data, id: ref.id };
  await setDoc(ref, full);
  return full;
}

export async function fetchSimulationResultForSession(
  uid: string,
  sessionId: string,
): Promise<BoardSimulationResultDoc | null> {
  const snap = await getDocs(
    query(
      sub(uid, SUB.SIMULATION_RESULTS),
      where("sessionId", "==", sessionId),
      qLimit(1),
    ),
  );
  const d = snap.docs[0];
  return d
    ? ({ id: d.id, ...(d.data() as Omit<BoardSimulationResultDoc, "id">) })
    : null;
}