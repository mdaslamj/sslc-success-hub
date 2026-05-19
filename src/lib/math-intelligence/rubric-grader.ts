import type {
  MathFormulaDoc,
  MathModelAnswerDoc,
  MathRubricDoc,
} from "@/integrations/firebase/types";

export type RubricGradeBreakdown = {
  key: string;
  label: string;
  marksAwarded: number;
  marksAvailable: number;
  satisfied: boolean;
  matchedKeywords: string[];
  missedKeywords: string[];
};

export type RubricGradeResult = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  breakdown: RubricGradeBreakdown[];
  formulasUsed: string[]; // formula ids referenced in the text
  stepsCovered: number;
  stepsTotal: number;
};

function includesAny(text: string, terms: string[]): string[] {
  return terms.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
}

/**
 * Grade student text against a rubric + optional model answer. Heuristic
 * today (keyword + step coverage); LLM-swappable later without changing
 * the result shape.
 */
export function gradeWithRubric(args: {
  studentText: string;
  rubric: MathRubricDoc;
  modelAnswer?: MathModelAnswerDoc | null;
  formulas?: MathFormulaDoc[];
}): RubricGradeResult {
  const { studentText, rubric, modelAnswer, formulas = [] } = args;
  const text = studentText ?? "";

  // Formula detection — match formula label OR expression substring.
  const formulasUsed = formulas
    .filter((f) =>
      [f.label, f.expression].some((s) =>
        s ? text.toLowerCase().includes(s.toLowerCase()) : false,
      ),
    )
    .map((f) => f.id);

  // Step coverage from the model answer (heuristic — token overlap per step).
  let stepsCovered = 0;
  const stepsTotal = modelAnswer?.steps.length ?? 0;
  if (modelAnswer) {
    for (const step of modelAnswer.steps) {
      const tokens = step.text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3);
      const hits = tokens.filter((t) => text.toLowerCase().includes(t)).length;
      if (tokens.length > 0 && hits / tokens.length >= 0.35) stepsCovered++;
    }
  }

  const breakdown: RubricGradeBreakdown[] = rubric.criteria.map((c) => {
    const keywords = c.keywords ?? [];
    const matched = includesAny(text, keywords);
    const missed = keywords.filter((k) => !matched.includes(k));

    // Award marks by criterion key.
    let satisfied = false;
    if (c.key === "formula") {
      satisfied = formulasUsed.length > 0;
    } else if (c.key === "final") {
      satisfied = modelAnswer
        ? text.toLowerCase().includes(modelAnswer.finalAnswer.toLowerCase().slice(0, 12))
        : text.length > 10;
    } else if (c.key === "substitution" || c.key === "calculation") {
      // Numeric expression presence as a weak proxy.
      satisfied = /\d+\s*[+\-*/=]\s*\d+/.test(text) || stepsCovered > 0;
    } else if (keywords.length > 0) {
      satisfied = matched.length / keywords.length >= 0.5;
    } else {
      satisfied = text.length > 20;
    }

    const partial = keywords.length > 0 ? matched.length / keywords.length : satisfied ? 1 : 0.4;
    const marksAwarded = satisfied
      ? c.marks
      : +(c.marks * Math.min(1, partial)).toFixed(2);

    return {
      key: c.key,
      label: c.label,
      marksAwarded,
      marksAvailable: c.marks,
      satisfied,
      matchedKeywords: matched,
      missedKeywords: missed,
    };
  });

  const totalScore = +breakdown.reduce((s, b) => s + b.marksAwarded, 0).toFixed(2);
  const maxScore = rubric.totalMarks;
  const percentage = maxScore > 0 ? +((totalScore / maxScore) * 100).toFixed(1) : 0;

  return {
    totalScore,
    maxScore,
    percentage,
    breakdown,
    formulasUsed,
    stepsCovered,
    stepsTotal,
  };
}