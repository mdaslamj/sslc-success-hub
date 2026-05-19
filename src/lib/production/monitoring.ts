/**
 * Lightweight client-side monitoring + diagnostics.
 * Records performance, AI, OCR, and evaluation events to a bounded
 * in-memory ring buffer that the app or a background flusher can drain.
 */

export type MonitoringEventKind =
  | "perf"
  | "ai_request"
  | "ai_response"
  | "ai_error"
  | "ocr_failure"
  | "evaluation_failure"
  | "firestore_error"
  | "info";

export type MonitoringEvent = {
  kind: MonitoringEventKind;
  label: string;
  /** ms timestamp. */
  at: number;
  /** Optional numeric measurement (latency, score, count). */
  value?: number;
  /** Bounded metadata bag. */
  meta?: Record<string, string | number | boolean | null>;
};

const BUFFER_LIMIT = 200;
const buffer: MonitoringEvent[] = [];
const subscribers = new Set<(evt: MonitoringEvent) => void>();

function push(evt: MonitoringEvent) {
  buffer.push(evt);
  if (buffer.length > BUFFER_LIMIT) buffer.shift();
  for (const sub of subscribers) {
    try {
      sub(evt);
    } catch {
      /* swallow */
    }
  }
}

export function recordEvent(
  kind: MonitoringEventKind,
  label: string,
  value?: number,
  meta?: MonitoringEvent["meta"],
) {
  push({ kind, label, at: Date.now(), value, meta });
}

/** Time an async block and record a `perf` event with its duration in ms. */
export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: MonitoringEvent["meta"],
): Promise<T> {
  const start =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const out = await fn();
    const dur =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
      start;
    recordEvent("perf", label, dur, meta);
    return out;
  } catch (err) {
    const dur =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
      start;
    recordEvent("perf", `${label}:error`, dur, {
      ...(meta ?? {}),
      error: (err as Error)?.message ?? String(err),
    });
    throw err;
  }
}

export function logOcrFailure(reason: string, meta?: MonitoringEvent["meta"]) {
  recordEvent("ocr_failure", reason, undefined, meta);
}

export function logEvaluationFailure(
  reason: string,
  meta?: MonitoringEvent["meta"],
) {
  recordEvent("evaluation_failure", reason, undefined, meta);
}

export function logAiDiagnostic(
  label: string,
  ok: boolean,
  meta?: MonitoringEvent["meta"],
) {
  recordEvent(ok ? "ai_response" : "ai_error", label, undefined, meta);
}

/** Drain the buffer (and return what was drained). */
export function drainEvents(): MonitoringEvent[] {
  const out = buffer.slice();
  buffer.length = 0;
  return out;
}

export function readEvents(): readonly MonitoringEvent[] {
  return buffer.slice();
}

export function subscribeMonitoring(
  cb: (evt: MonitoringEvent) => void,
): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}