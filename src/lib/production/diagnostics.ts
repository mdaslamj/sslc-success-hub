/**
 * Diagnostics logging for OCR, AI gateway, and offline sync failures.
 * Wraps the existing monitoring ring buffer with structured helpers
 * the admin ops panel can render and the support team can export.
 */

import { recordEvent, readEvents, type MonitoringEvent } from "./monitoring";
import { getEnvConfig } from "./env-config";

export function logCrash(error: unknown, ctx?: Record<string, string | number>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.slice(0, 1500) ?? "" : "";
  recordEvent("ai_error", "crash", undefined, {
    message,
    stack,
    release: getEnvConfig().release,
    env: getEnvConfig().env,
    ...ctx,
  });
}

export function logSyncFailure(scope: string, reason: string, attempts: number) {
  recordEvent("firestore_error", `sync:${scope}`, attempts, { reason });
}

export function logOcrDiagnostic(stage: string, ok: boolean, latencyMs?: number) {
  recordEvent(ok ? "perf" : "ocr_failure", `ocr:${stage}`, latencyMs, { ok });
}

export function logAiDiagnosticDetailed(
  model: string,
  ok: boolean,
  latencyMs?: number,
  tokens?: number,
) {
  recordEvent(ok ? "ai_response" : "ai_error", `model:${model}`, latencyMs, {
    tokens: tokens ?? 0,
  });
}

export function snapshotDiagnostics(): {
  crashes: MonitoringEvent[];
  ocrFailures: MonitoringEvent[];
  syncFailures: MonitoringEvent[];
  aiErrors: MonitoringEvent[];
  perf: MonitoringEvent[];
} {
  const all = readEvents();
  return {
    crashes: all.filter((e) => e.label === "crash"),
    ocrFailures: all.filter((e) => e.kind === "ocr_failure"),
    syncFailures: all.filter((e) => e.kind === "firestore_error"),
    aiErrors: all.filter((e) => e.kind === "ai_error"),
    perf: all.filter((e) => e.kind === "perf").slice(-50),
  };
}

export function installGlobalCrashHandlers() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __auraCrashInstalled?: boolean };
  if (w.__auraCrashInstalled) return;
  w.__auraCrashInstalled = true;
  window.addEventListener("error", (e) => logCrash(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => logCrash(e.reason));
}