import type {
  MathChapterDoc,
  MathCommonMistakeDoc,
  MathFormulaDoc,
  MathModelAnswerDoc,
  MathQuestionDoc,
  MathRubricDoc,
} from "@/integrations/firebase/types";

/**
 * Self-contained context object for an AI tutor / LLM grading call.
 * Today the consumer is the heuristic grader; tomorrow this is serialized
 * into a prompt template for Gemini / GPT via the Lovable AI Gateway.
 */
export type TutorContext = {
  question: MathQuestionDoc;
  chapter: MathChapterDoc;
  formulas: MathFormulaDoc[];
  rubric: MathRubricDoc;
  modelAnswer: MathModelAnswerDoc | null;
  commonMistakes: MathCommonMistakeDoc[];
};

export function buildTutorContext(args: TutorContext): TutorContext {
  return args;
}

/** Render context as a compact prompt fragment for an LLM. */
export function tutorContextToPrompt(ctx: TutorContext): string {
  const lines: string[] = [];
  lines.push(`Chapter: ${ctx.chapter.title}`);
  lines.push(`Question (${ctx.question.questionType}, ${ctx.question.marks}m): ${ctx.question.statement}`);
  if (ctx.formulas.length) {
    lines.push("Relevant formulas:");
    for (const f of ctx.formulas) lines.push(`  - ${f.label}: ${f.expression}`);
  }
  if (ctx.modelAnswer) {
    lines.push("Model answer steps:");
    for (const s of ctx.modelAnswer.steps)
      lines.push(`  ${s.order}. (${s.marks}m) ${s.text}`);
    lines.push(`Final: ${ctx.modelAnswer.finalAnswer}`);
  }
  lines.push("Rubric:");
  for (const c of ctx.rubric.criteria)
    lines.push(`  - ${c.label} (${c.marks}m${c.required ? ", required" : ""})`);
  if (ctx.commonMistakes.length) {
    lines.push("Watch for common mistakes:");
    for (const m of ctx.commonMistakes) lines.push(`  - ${m.title}: ${m.correction}`);
  }
  return lines.join("\n");
}