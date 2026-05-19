import type {
  ChapterIntelligenceDoc,
  HintHistoryDoc,
  MathChapterDoc,
  MathCommonMistakeDoc,
  MathFormulaDoc,
  MathKeywordDoc,
  MathModelAnswerDoc,
  MathQuestionDoc,
  MathRubricDoc,
  MemoryTrackingDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

/**
 * Everything the LLM may use to ground its response. None of these signals
 * are sent to the model verbatim — `buildGroundingPrompt` extracts the
 * minimum useful payload.
 */
export type GroundingPayload = {
  chapter: MathChapterDoc;
  question?: MathQuestionDoc;
  modelAnswer?: MathModelAnswerDoc | null;
  rubric?: MathRubricDoc | null;
  formulas?: MathFormulaDoc[];
  keywords?: MathKeywordDoc[];
  commonMistakes?: MathCommonMistakeDoc[];
  chapterIntelligence?: ChapterIntelligenceDoc | null;
  weakness?: WeaknessProfileDoc | null;
  memory?: MemoryTrackingDoc | null;
  /** Latest OCR-evaluated student answer text, if any. */
  ocrStudentAnswer?: string;
  /** Trailing hints already shown for this question. */
  priorHints?: HintHistoryDoc[];
};

/** Render the grounding payload as a compact system-context block. */
export function buildGroundingPrompt(p: GroundingPayload): string {
  const lines: string[] = [];
  lines.push(`# Chapter: ${p.chapter.title}`);
  if (p.chapter.subjectId) lines.push(`Subject: ${p.chapter.subjectId}`);
  if (p.question) {
    lines.push(
      `\n## Question (${p.question.questionType}, ${p.question.marks}m)`,
    );
    lines.push(p.question.statement);
  }
  if (p.formulas?.length) {
    lines.push("\n## Relevant formulas");
    for (const f of p.formulas.slice(0, 12))
      lines.push(`- ${f.label}: ${f.expression}`);
  }
  if (p.keywords?.length) {
    lines.push("\n## Key vocabulary");
    lines.push(p.keywords.slice(0, 15).map((k) => k.term).join(", "));
  }
  if (p.rubric) {
    lines.push("\n## Rubric (deterministic — do not override)");
    for (const c of p.rubric.criteria)
      lines.push(`- ${c.label} (${c.marks}m${c.required ? ", required" : ""})`);
  }
  if (p.modelAnswer) {
    lines.push("\n## Model answer (canonical solution)");
    for (const s of p.modelAnswer.steps)
      lines.push(`${s.order}. (${s.marks}m) ${s.text}`);
    lines.push(`Final: ${p.modelAnswer.finalAnswer}`);
  }
  if (p.commonMistakes?.length) {
    lines.push("\n## Common mistakes to watch for");
    for (const m of p.commonMistakes.slice(0, 6))
      lines.push(`- ${m.title}: ${m.correction}`);
  }
  if (p.chapterIntelligence) {
    const ci = p.chapterIntelligence;
    lines.push("\n## Cohort signals");
    if (ci.avgAccuracy != null)
      lines.push(`Average cohort accuracy: ${(ci.avgAccuracy * 100).toFixed(0)}%`);
    if (ci.weakSubtopics?.length)
      lines.push(`Frequently weak subtopics: ${ci.weakSubtopics.join(", ")}`);
  }
  if (p.weakness) {
    lines.push("\n## This student's weakness profile (private)");
    if (p.weakness.dominantLayer)
      lines.push(`Dominant weakness layer: ${p.weakness.dominantLayer}`);
    if (p.weakness.repeatedMistakes?.length)
      lines.push(
        `Repeated mistakes: ${p.weakness.repeatedMistakes
          .slice(0, 5)
          .map((m) => m.label)
          .join(", ")}`,
      );
  }
  if (p.memory) {
    lines.push("\n## Memory / retention snapshot");
    if (p.memory.retentionScore != null)
      lines.push(`Retention score: ${Math.round(p.memory.retentionScore)}/100`);
    if (p.memory.confidenceDecay != null)
      lines.push(`Confidence decay: ${p.memory.confidenceDecay.toFixed(2)}`);
  }
  if (p.ocrStudentAnswer) {
    lines.push("\n## Student's handwritten attempt (OCR)");
    lines.push(p.ocrStudentAnswer);
  }
  if (p.priorHints?.length) {
    lines.push("\n## Hints already shown");
    for (const h of p.priorHints) lines.push(`- [${h.level}] ${h.text}`);
  }
  return lines.join("\n");
}