/**
 * Aura theme contract.
 *
 * Standalone, type-safe theme tokens consumed by future dashboard
 * components. Engine, hook, and JSON files are NOT touched by this file.
 *
 * Color values intentionally use hex (not raw CSS vars) so they can be
 * passed to SVG `fill`/`stroke` attributes and inline charts. They are
 * tuned to align with the Cloud White / Deep Slate palette defined in
 * `src/styles.css`.
 */

import type { Archetype, Subject } from "@/types/aura-engine-contracts";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ARCHETYPE THEMES
// ─────────────────────────────────────────────────────────────────────────────

export type LayoutDensity = "simple" | "standard" | "advanced";

export interface ArchetypeTheme {
  /** Dominant brand color for the archetype (hero accents, primary CTA). */
  primary: string;
  /** Secondary accent for highlights, charts, badges. */
  accent: string;
  /** Muted/dim color for non-critical UI and de-emphasised text. */
  dim: string;
  /** Badge background color for archetype label pills. */
  badge: string;
  /** Emotional/messaging tone — drives copy selection. */
  tone: "recovery" | "optimization" | "challenge" | "reassurance";
  /** Dashboard density mode the layout engine should render. */
  layoutDensity: LayoutDensity;
  /** Engine metric keys this archetype should surface on the dashboard. */
  showMetrics: string[];
}

export const ARCHETYPE_THEMES: Record<Archetype, ArchetypeTheme> = {
  struggling: {
    primary: "#10b981",       // calming emerald — progress, not pressure
    accent: "#34d399",
    dim: "#94a3b8",
    badge: "#d1fae5",
    tone: "reassurance",
    layoutDensity: "simple",
    showMetrics: ["consistency", "accuracy", "recovery"],
  },
  average: {
    primary: "#3b82f6",       // brand blue — matches styles.css --primary
    accent: "#6366f1",
    dim: "#94a3b8",
    badge: "#dbeafe",
    tone: "optimization",
    layoutDensity: "standard",
    showMetrics: [
      "consistency",
      "accuracy",
      "recovery",
      "momentum",
      "discipline",
    ],
  },
  topper: {
    primary: "#8b5cf6",       // precision violet — premium / focused
    accent: "#a855f7",
    dim: "#64748b",
    badge: "#ede9fe",
    tone: "challenge",
    layoutDensity: "advanced",
    showMetrics: [
      "consistency",
      "accuracy",
      "recovery",
      "momentum",
      "discipline",
      "confidenceStability",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. URGENCY STYLE
// ─────────────────────────────────────────────────────────────────────────────

export interface UrgencyStyle {
  color: string;
  label: string;
  background: string;
}

/**
 * Map a 0–100 percentage (e.g. mastery, readiness) to a 4-band urgency style.
 * Lower percentages = higher urgency.
 *
 *   0–24  → critical (red)
 *  25–49  → high     (amber)
 *  50–74  → medium   (blue)
 *  75–100 → low      (green)
 */
export function getUrgencyStyle(pct: number): UrgencyStyle {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

  if (p < 50) {
    return {
      color: "#ef4444",
      label: "CRITICAL",
      background: "#ef444414",
    };
  }
  if (p < 70) {
    return {
      color: "#f59e0b",
      label: "AT RISK",
      background: "#f59e0b14",
    };
  }
  if (p < 85) {
    return {
      color: "#22c55e",
      label: "GOOD",
      background: "#22c55e12",
    };
  }
  return {
    color: "#34d399",
    label: "STRONG",
    background: "#34d39912",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUBJECT COLORS + NAMES
// ─────────────────────────────────────────────────────────────────────────────

export const SUBJECT_COLORS: Record<Subject, string> = {
  math: "#6366f1",
  science: "#06b6d4",
  social: "#f59e0b",
};

export const SUBJECT_NAMES: Record<Subject, string> = {
  math: "Mathematics",
  science: "Science",
  social: "Social Science",
};