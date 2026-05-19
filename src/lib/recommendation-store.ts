/**
 * Local-first recommendations + AI insights store. Mirrors the Firestore
 * service interface so call sites stay stable once Firebase Auth lands and
 * writes fan out to Firestore.
 */

import type {
  AiInsightDoc,
  RecommendationDoc,
  RecommendationStatus,
} from "@/integrations/firebase/types";

const RECS_KEY = "vidyapath.recs.v1";
const INSIGHTS_KEY = "vidyapath.insights.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / SSR / private mode — silently drop */
  }
}

// ---------- Recommendations ----------

export function readRecommendations(userId: string): RecommendationDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<RecommendationDoc[]>(localStorage.getItem(RECS_KEY), []);
  const now = Date.now();
  return all.filter(
    (r) =>
      r.userId === userId &&
      r.status === "active" &&
      (!r.expiresAt || r.expiresAt > now),
  );
}

export function writeRecommendations(
  userId: string,
  recs: RecommendationDoc[],
): RecommendationDoc[] {
  if (typeof window === "undefined") return recs;
  const all = safeParse<RecommendationDoc[]>(localStorage.getItem(RECS_KEY), []);
  // Preserve dismissed/acted history for other users; replace this user's
  // active recs with the fresh batch but keep their dismissed log so we
  // don't keep re-surfacing the same nudge.
  const dismissedIds = new Set(
    all
      .filter((r) => r.userId === userId && r.status !== "active")
      .map((r) => r.id),
  );
  const fresh = recs.filter((r) => !dismissedIds.has(r.id));
  const other = all.filter((r) => r.userId !== userId);
  const userHistory = all.filter((r) => r.userId === userId && r.status !== "active");
  const next = [...other, ...userHistory, ...fresh];
  safeWrite(RECS_KEY, next.slice(-500));
  return fresh;
}

export function updateRecommendationStatus(
  recId: string,
  status: RecommendationStatus,
): RecommendationDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<RecommendationDoc[]>(localStorage.getItem(RECS_KEY), []);
  const idx = all.findIndex((r) => r.id === recId);
  if (idx === -1) return null;
  const now = Date.now();
  const updated: RecommendationDoc = {
    ...all[idx],
    status,
    dismissedAt: status === "dismissed" ? now : all[idx].dismissedAt,
    actedAt: status === "acted" ? now : all[idx].actedAt,
  };
  all[idx] = updated;
  safeWrite(RECS_KEY, all);
  return updated;
}

// ---------- Insights ----------

export function readInsight(userId: string, periodKey: string): AiInsightDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<AiInsightDoc[]>(localStorage.getItem(INSIGHTS_KEY), []);
  return all.find((i) => i.userId === userId && i.periodKey === periodKey) ?? null;
}

export function writeInsight(insight: AiInsightDoc): AiInsightDoc {
  if (typeof window === "undefined") return insight;
  const all = safeParse<AiInsightDoc[]>(localStorage.getItem(INSIGHTS_KEY), []);
  const next = all.filter((i) => i.id !== insight.id).concat(insight);
  safeWrite(INSIGHTS_KEY, next.slice(-200));
  return insight;
}