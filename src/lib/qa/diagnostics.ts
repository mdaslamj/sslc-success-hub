/**
 * Lightweight QA diagnostics for navigation/action failures and dead clicks.
 * Buffered in-memory + mirrored to console; surfaces via `window.__auraQA`.
 */
export type QAEvent =
  | "NAVIGATION_FAILED"
  | "NAVIGATION_MISSING_ROUTE"
  | "ACTION_FAILED"
  | "DEAD_CLICK"
  | "UNHANDLED_REJECTION"
  | "RUNTIME_ERROR";

export interface QARecord {
  type: QAEvent;
  at: number;
  details: Record<string, unknown>;
}

const BUFFER: QARecord[] = [];
const MAX = 200;

export function logQADiagnostic(type: QAEvent, details: Record<string, unknown> = {}) {
  const record: QARecord = { type, at: Date.now(), details };
  BUFFER.push(record);
  if (BUFFER.length > MAX) BUFFER.splice(0, BUFFER.length - MAX);
  // eslint-disable-next-line no-console
  console.warn(`[QA:${type}]`, details);
  if (typeof window !== "undefined") {
    (window as unknown as { __auraQA?: QARecord[] }).__auraQA = BUFFER;
  }
}

export function getQADiagnostics(): QARecord[] {
  return [...BUFFER];
}

/** Known top-level routes — used to flag links to missing destinations. */
export const KNOWN_ROUTES = new Set<string>([
  "/",
  "/login",
  "/forgot-password",
  "/onboarding",
  "/seed",
  "/privacy",
  "/profile",
  "/planner",
  "/log",
  "/subjects",
  "/exams",
  "/exam-hall",
  "/exam-results",
  "/answer-uploads",
  "/analytics",
  "/predictions",
  "/achievements",
  "/admin/import",
  "/admin/ops",
  "/focus",
  "/quizzes",
  "/resources",
  "/textbooks",
  "/targets",
  "/parent",
  "/teacher",
  "/scan",
  "/session",
  "/voice",
  "/account/delete",
]);

export function isLikelyKnownPath(path: string): boolean {
  if (!path.startsWith("/")) return true; // external or hash — out of scope
  const base = "/" + path.split("/").filter(Boolean).slice(0, 2).join("/");
  const top = "/" + (path.split("/").filter(Boolean)[0] ?? "");
  return KNOWN_ROUTES.has(path) || KNOWN_ROUTES.has(base) || KNOWN_ROUTES.has(top);
}