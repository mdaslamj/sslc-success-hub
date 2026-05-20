/**
 * Product analytics: onboarding funnel, retention, study duration,
 * feature usage, scan frequency and conversion events. All events
 * are sampled (env-aware), buffered locally, and surfaced to the
 * admin ops dashboard for inspection.
 */

import { recordEvent } from "./monitoring";
import { getEnvConfig } from "./env-config";

export type FunnelStep =
  | "landing_view"
  | "signup_start"
  | "signup_complete"
  | "onboarding_started"
  | "onboarding_completed"
  | "first_scan"
  | "first_quiz"
  | "first_session_complete"
  | "first_week_retained";

export type ProductEvent =
  | { kind: "funnel"; step: FunnelStep; meta?: Record<string, string | number> }
  | { kind: "feature_use"; feature: string; meta?: Record<string, string | number> }
  | { kind: "scan"; subject?: string; ok: boolean }
  | { kind: "study_duration"; minutes: number; subject?: string }
  | { kind: "retention_ping"; dayOffset: number }
  | { kind: "conversion"; plan: string; amount?: number };

const STORAGE_KEY = "aura:product-analytics:v1";
const MAX_BUFFER = 500;

type StoredEvent = ProductEvent & { at: number };

function load(): StoredEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(events: StoredEvent[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_BUFFER)),
    );
  } catch {
    /* swallow */
  }
}

export function trackProductEvent(evt: ProductEvent) {
  const { analyticsSampleRate } = getEnvConfig();
  if (Math.random() > analyticsSampleRate && evt.kind !== "conversion") return;
  const stored: StoredEvent = { ...evt, at: Date.now() };
  const buf = load();
  buf.push(stored);
  save(buf);
  recordEvent("info", `product:${evt.kind}`, undefined, {
    sample: analyticsSampleRate,
  });
}

export function readProductEvents(): StoredEvent[] {
  return load();
}

export function clearProductEvents() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function summarizeFunnel(): Record<FunnelStep, number> {
  const buf = load();
  const out = {} as Record<FunnelStep, number>;
  for (const e of buf) {
    if (e.kind === "funnel") out[e.step] = (out[e.step] ?? 0) + 1;
  }
  return out;
}

export function summarizeFeatureUsage(): Array<{ feature: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of load()) {
    if (e.kind === "feature_use") {
      counts.set(e.feature, (counts.get(e.feature) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([feature, count]) => ({ feature, count })).sort(
    (a, b) => b.count - a.count,
  );
}

export function summarizeStudyMinutes(): number {
  return load()
    .filter((e): e is StoredEvent & { kind: "study_duration" } => e.kind === "study_duration")
    .reduce((acc, e) => acc + e.minutes, 0);
}

export function summarizeScanSuccessRate(): { total: number; success: number } {
  const scans = load().filter(
    (e): e is StoredEvent & { kind: "scan" } => e.kind === "scan",
  );
  return {
    total: scans.length,
    success: scans.filter((s) => s.ok).length,
  };
}