import type {
  BoardSimulationResultDoc,
  ExamHallSessionDoc,
  InvigilatorEventDoc,
} from "@/integrations/firebase/types";

/**
 * Guest / offline fallback for the exam hall. Persists sessions, events,
 * and final results to localStorage so a student without auth can still
 * run a full simulation and review their analysis.
 */
const SESSIONS_KEY = "aura.examHall.sessions.v1";
const EVENTS_KEY = "aura.examHall.events.v1";
const RESULTS_KEY = "aura.examHall.results.v1";

function safeGet<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}
function safeSet<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function localUpsertSession(s: ExamHallSessionDoc) {
  const list = safeGet<ExamHallSessionDoc>(SESSIONS_KEY);
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  else list.unshift(s);
  safeSet(SESSIONS_KEY, list.slice(0, 30));
}

export function localListSessions(): ExamHallSessionDoc[] {
  return safeGet<ExamHallSessionDoc>(SESSIONS_KEY);
}

export function localGetSession(id: string): ExamHallSessionDoc | undefined {
  return safeGet<ExamHallSessionDoc>(SESSIONS_KEY).find((s) => s.id === id);
}

export function localPushEvent(e: InvigilatorEventDoc) {
  const list = safeGet<InvigilatorEventDoc>(EVENTS_KEY);
  list.push(e);
  safeSet(EVENTS_KEY, list.slice(-200));
}

export function localListEvents(sessionId: string): InvigilatorEventDoc[] {
  return safeGet<InvigilatorEventDoc>(EVENTS_KEY).filter(
    (e) => e.sessionId === sessionId,
  );
}

export function localSaveResult(r: BoardSimulationResultDoc) {
  const list = safeGet<BoardSimulationResultDoc>(RESULTS_KEY);
  const idx = list.findIndex((x) => x.sessionId === r.sessionId);
  if (idx >= 0) list[idx] = r;
  else list.unshift(r);
  safeSet(RESULTS_KEY, list.slice(0, 30));
}

export function localGetResult(
  sessionId: string,
): BoardSimulationResultDoc | undefined {
  return safeGet<BoardSimulationResultDoc>(RESULTS_KEY).find(
    (r) => r.sessionId === sessionId,
  );
}