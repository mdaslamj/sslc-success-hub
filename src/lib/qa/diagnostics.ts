/**
 * Lightweight QA diagnostics for navigation/action failures and dead clicks.
 * Buffered in-memory + mirrored to console. In development builds only, the
 * buffer is also surfaced via `window.__auraQA` for debugging. Production
 * builds never expose the buffer globally and sanitize sensitive details
 * (file paths, document paths, UIDs) before storing.
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

const IS_DEV =
  typeof import.meta !== "undefined" &&
  Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

const SENSITIVE_KEYS = new Set(["filename", "source", "url", "stack", "lineno", "colno"]);

function sanitizeString(value: string): string {
  // Strip URLs/paths and Firestore-style document paths that can leak
  // internal structure or user identifiers.
  return value
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/\/(databases|documents|users)\/[^\s"')]+/gi, "/$1/[redacted]")
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, "[id]")
    .slice(0, 300);
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  if (IS_DEV) return details;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    if (typeof value === "string") out[key] = sanitizeString(value);
    else if (typeof value === "number" || typeof value === "boolean" || value == null) out[key] = value;
    else out[key] = "[object]";
  }
  return out;
}

export function logQADiagnostic(type: QAEvent, details: Record<string, unknown> = {}) {
  const safeDetails = sanitizeDetails(details);
  const record: QARecord = { type, at: Date.now(), details: safeDetails };
  BUFFER.push(record);
  if (BUFFER.length > MAX) BUFFER.splice(0, BUFFER.length - MAX);
  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[QA:${type}]`, safeDetails);
  }
  if (IS_DEV && typeof window !== "undefined") {
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