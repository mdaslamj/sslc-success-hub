import type {
  ExamHallQuestion,
  ExamHallSessionDoc,
} from "@/integrations/firebase/types";

/**
 * Lightweight, on-device evaluation of presentation quality.
 * Real grading should still go through OCR + semantic reasoning;
 * this is the immediate post-exam summary the student sees.
 */
export function evaluatePresentation(session: ExamHallSessionDoc) {
  const allQuestions = session.sections.flatMap((s) =>
    s.questions.map((q) => ({ q, sectionKind: s.kind })),
  );

  const longQs = allQuestions.filter(
    (x) => x.sectionKind === "long" || x.q.kind === "long",
  );
  const diagramQs = allQuestions.filter(
    (x) => x.sectionKind === "diagram" || x.q.kind === "diagram",
  );

  const structureScore = avg(
    longQs.map(({ q }) => structureScoreForAnswer(session.answers[q.id]?.text ?? "")),
  );
  const keywordCoverage = avg(
    allQuestions
      .filter(({ q }) => (q.keywords?.length ?? 0) > 0)
      .map(({ q }) =>
        keywordCoverageFor(session.answers[q.id]?.text ?? "", q),
      ),
  );
  const diagramLabeling = avg(
    diagramQs.map(({ q }) =>
      keywordCoverageFor(session.answers[q.id]?.text ?? "", q),
    ),
  );
  const longAnswerOrganization = avg(
    longQs.map(({ q }) =>
      organizationScoreFor(session.answers[q.id]?.text ?? ""),
    ),
  );

  return {
    structureScore,
    keywordCoverage,
    diagramLabeling,
    longAnswerOrganization,
  };
}

function structureScoreForAnswer(text: string): number {
  if (!text.trim()) return 0;
  const sentences = text.split(/[.!?\n]/).filter((s) => s.trim().length > 0);
  const hasNumbering = /\b(1[.)]|2[.)]|step\s*1)/i.test(text);
  const lengthOk = text.length > 80;
  return Math.min(
    1,
    (sentences.length >= 3 ? 0.4 : 0.15) +
      (hasNumbering ? 0.3 : 0) +
      (lengthOk ? 0.3 : 0.1),
  );
}

function keywordCoverageFor(text: string, q: ExamHallQuestion): number {
  const kws = q.keywords ?? [];
  if (kws.length === 0) return 0.6;
  const lower = text.toLowerCase();
  const hits = kws.filter((k) => lower.includes(k.toLowerCase())).length;
  return hits / kws.length;
}

function organizationScoreFor(text: string): number {
  if (!text.trim()) return 0;
  const hasIntro = /\b(introduction|definition|let us)/i.test(text);
  const hasConclusion = /\b(therefore|hence|in conclusion|finally)/i.test(text);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return Math.min(
    1,
    (hasIntro ? 0.35 : 0.1) +
      (hasConclusion ? 0.35 : 0.1) +
      (paragraphs.length >= 2 ? 0.3 : 0.15),
  );
}

function avg(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}