import type { PersistedExamSession } from "@/types/examSimulation";
import { EXAM_SESSION_STORAGE_KEY } from "@/types/examSimulation";

export function loadExamSession(): PersistedExamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EXAM_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedExamSession) : null;
  } catch {
    return null;
  }
}

export function saveExamSession(session: PersistedExamSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXAM_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage full or unavailable */
  }
}

export function clearExamSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
