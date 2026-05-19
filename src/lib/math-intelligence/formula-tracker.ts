import type {
  MathChapterAnalyticsDoc,
  MathFormulaDoc,
} from "@/integrations/firebase/types";

export type FormulaAccuracy = {
  formulaId: string;
  label?: string;
  attempts: number;
  correct: number;
  accuracyPct: number;
};

/** Pure incremental update for a single formula application. */
export function recordFormulaUsage(
  prev: MathChapterAnalyticsDoc["formulaAccuracy"],
  formulaId: string,
  correct: boolean,
): MathChapterAnalyticsDoc["formulaAccuracy"] {
  const cur = prev[formulaId] ?? { attempts: 0, correct: 0 };
  return {
    ...prev,
    [formulaId]: {
      attempts: cur.attempts + 1,
      correct: cur.correct + (correct ? 1 : 0),
    },
  };
}

export function summarizeFormulaAccuracy(
  analytics: MathChapterAnalyticsDoc,
  formulas: MathFormulaDoc[] = [],
): FormulaAccuracy[] {
  const labelById = new Map(formulas.map((f) => [f.id, f.label]));
  return Object.entries(analytics.formulaAccuracy)
    .map(([formulaId, s]) => ({
      formulaId,
      label: labelById.get(formulaId),
      attempts: s.attempts,
      correct: s.correct,
      accuracyPct:
        s.attempts > 0 ? +((s.correct / s.attempts) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct);
}