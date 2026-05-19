/**
 * AI evaluation service for handwritten answer attempts.
 *
 * Today: a heuristic engine compares the student's OCR-corrected text against
 * an (optional) model answer + rubric and produces a fully-shaped
 * `EvaluationDoc`. This exists so the entire UI — score, strengths,
 * mistakes, missing points, presentation/conceptual feedback, improvement
 * suggestions, per-question breakdown — is exercised without any LLM
 * dependency.
 *
 * Tomorrow: swap `runHeuristicEvaluation` for an LLM call (GPT / Gemini via
 * the Lovable AI Gateway) that returns the same shape. No call site changes.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  AnswerAttemptDoc,
  AnswerUploadDoc,
  EvaluationDoc,
  EvaluationPerQuestion,
  EvaluationRubricDoc,
  EvaluationSeverity,
  EvaluationState,
  ModelAnswerDoc,
  WeaknessReportDoc,
} from "../types";
import {
  fetchAttempt,
  fetchAttemptImages,
  setAttemptProcessingState,
} from "./answer-uploads";

// ---------------------------------------------------------------------------
// Default rubric — board-style criteria. Used when no rubric override exists
// for the subject/question. Weights sum to 1.0.
// ---------------------------------------------------------------------------

export const DEFAULT_RUBRIC: EvaluationRubricDoc = {
  id: "default_sslc",
  name: "Karnataka SSLC — default",
  board: "Karnataka SSLC",
  criteria: [
    { key: "content", label: "Content accuracy", weight: 0.45 },
    { key: "concepts", label: "Conceptual clarity", weight: 0.25 },
    { key: "keywords", label: "Key terms used", weight: 0.15 },
    { key: "presentation", label: "Presentation & structure", weight: 0.15 },
  ],
  presentationMaxPct: 15,
  updatedAt: 0,
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function fetchEvaluation(
  attemptId: string,
): Promise<EvaluationDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.EVALUATIONS, attemptId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<EvaluationDoc, "id">) };
}

export async function saveEvaluation(evalDoc: EvaluationDoc): Promise<void> {
  const clean: Record<string, unknown> = { ...evalDoc };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  await setDoc(doc(db, COLLECTIONS.EVALUATIONS, evalDoc.id), clean);
}

export async function setEvaluationState(
  attemptId: string,
  state: EvaluationState,
  patch: Partial<Pick<EvaluationDoc, "error">> = {},
): Promise<void> {
  const update: Record<string, unknown> = { state, updatedAt: Date.now() };
  if (patch.error !== undefined) update.error = patch.error;
  await updateDoc(doc(db, COLLECTIONS.EVALUATIONS, attemptId), update);
}

export async function fetchModelAnswer(
  subjectId: string,
  questionId: string,
): Promise<ModelAnswerDoc | null> {
  const q = query(
    collection(db, COLLECTIONS.MODEL_ANSWERS),
    where("subjectId", "==", subjectId),
    where("questionId", "==", questionId),
    qLimit(1),
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return { id: first.id, ...(first.data() as Omit<ModelAnswerDoc, "id">) };
}

export async function fetchRubric(
  rubricId?: string,
): Promise<EvaluationRubricDoc> {
  if (!rubricId) return DEFAULT_RUBRIC;
  const snap = await getDoc(doc(db, COLLECTIONS.EVALUATION_RUBRICS, rubricId));
  if (!snap.exists()) return DEFAULT_RUBRIC;
  return { id: snap.id, ...(snap.data() as Omit<EvaluationRubricDoc, "id">) };
}

export async function fetchUserEvaluations(
  userId: string,
  limit = 25,
): Promise<EvaluationDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.EVALUATIONS),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<EvaluationDoc, "id">),
  }));
}

// ---------------------------------------------------------------------------
// Heuristic evaluation engine
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","to","in","on","is","are","was","were",
  "be","been","being","it","that","this","these","those","for","with","as",
  "by","at","from","into","than","then","so","if","not","no","yes",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
}

function studentTextFor(img: AnswerUploadDoc): string {
  return (img.ocr.correctedText ?? img.ocr.extractedText ?? "").trim();
}

function severityFromScore(pct: number): EvaluationSeverity {
  if (pct < 40) return "high";
  if (pct < 70) return "medium";
  return "low";
}

/**
 * Build a per-question evaluation for a single image. When no curated model
 * answer exists, falls back to a length/keyword-presence heuristic so the
 * UI still gets useful feedback signals.
 */
function evaluateOne(
  img: AnswerUploadDoc,
  model: ModelAnswerDoc | null,
  rubric: EvaluationRubricDoc,
): EvaluationPerQuestion {
  const student = studentTextFor(img);
  const studentTokens = tokenize(student);
  const maxScore = model?.maxScore ?? 5;

  const modelTokens = model ? tokenize(model.answerText) : [];
  const keywords = (model?.keywords ?? []).map((k) => k.toLowerCase());
  const matchedKeywords = keywords.filter((k) =>
    student.toLowerCase().includes(k),
  );
  const missingKeywords = keywords.filter((k) => !matchedKeywords.includes(k));

  // Per-criterion 0..1 scores.
  const contentSim = model
    ? jaccard(studentTokens, modelTokens)
    : Math.min(1, studentTokens.length / 60);
  const keywordCoverage =
    keywords.length === 0 ? 0.7 : matchedKeywords.length / keywords.length;
  const conceptScore = model
    ? Math.max(contentSim, keywordCoverage * 0.9)
    : contentSim * 0.8;
  const presentationScore = Math.min(
    1,
    0.4 + (student.length > 80 ? 0.4 : 0.1) + (student.includes("\n") ? 0.2 : 0),
  );

  const perCriterionScores: Record<string, number> = {
    content: contentSim,
    concepts: conceptScore,
    keywords: keywordCoverage,
    presentation: presentationScore,
  };

  const rubricBreakdown = rubric.criteria.map((c) => ({
    key: c.key,
    label: c.label,
    weight: c.weight,
    score: +(((perCriterionScores[c.key] ?? 0.5) * c.weight) * maxScore).toFixed(2),
    comment:
      c.key === "keywords" && missingKeywords.length > 0
        ? `Missing: ${missingKeywords.slice(0, 4).join(", ")}`
        : undefined,
  }));

  const score = +rubricBreakdown.reduce((s, r) => s + r.score, 0).toFixed(2);
  const pct = (score / maxScore) * 100;

  // Build qualitative feedback.
  const strengths: string[] = [];
  const mistakes: string[] = [];
  const missingPoints: string[] = [];
  const improvementSuggestions: string[] = [];

  if (matchedKeywords.length > 0) {
    strengths.push(
      `Used ${matchedKeywords.length} key term${matchedKeywords.length === 1 ? "" : "s"} correctly`,
    );
  }
  if (contentSim > 0.5) {
    strengths.push("Answer closely matches the expected explanation");
  }
  if (presentationScore > 0.7) {
    strengths.push("Clear structure and adequate length");
  }

  if (missingKeywords.length > 0) {
    missingPoints.push(
      `Include the term${missingKeywords.length === 1 ? "" : "s"}: ${missingKeywords.slice(0, 5).join(", ")}`,
    );
    improvementSuggestions.push(
      "Revise the chapter glossary and rewrite the answer using the missing terms.",
    );
  }
  if (contentSim < 0.35 && model) {
    mistakes.push("Key parts of the model answer are missing or incorrect");
    improvementSuggestions.push(
      "Re-read the model answer and rewrite this question in your own words.",
    );
  }
  if (student.length < 40) {
    mistakes.push("Answer is too short for the marks allocated");
  }

  const presentationFeedback =
    presentationScore < 0.6
      ? "Use short paragraphs, underline key terms, and label diagrams."
      : "Presentation looks neat. Keep underlining key terms.";

  const conceptualFeedback =
    conceptScore < 0.5
      ? "Core concept needs revision — revisit the chapter summary."
      : "Concepts are mostly clear. Tighten definitions for full marks.";

  return {
    questionId: model?.questionId ?? img.questionId,
    imageId: img.id,
    questionText: model?.questionText,
    studentAnswer: student,
    score,
    maxScore,
    rubric: rubricBreakdown,
    matchedKeywords,
    missingKeywords,
    strengths,
    mistakes,
    missingPoints,
    presentationFeedback,
    conceptualFeedback,
    improvementSuggestions,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full evaluation pipeline for an attempt. Persists an
 * `EvaluationDoc` (id == attemptId), updates the parent attempt's
 * processingState, and refreshes the weakness report rollup.
 *
 * Replace `evaluateOne` / the model-answer lookup with an LLM call to plug
 * in real GPT / Gemini grading. The shape persisted here is unchanged.
 */
export async function runEvaluation(
  attemptId: string,
): Promise<EvaluationDoc | null> {
  const attempt = await fetchAttempt(attemptId);
  if (!attempt) return null;

  // Seed a "evaluating" doc immediately so the UI can show a spinner.
  const now = Date.now();
  const seed: EvaluationDoc = {
    id: attemptId,
    attemptId,
    userId: attempt.userId,
    subjectId: attempt.context.subjectId,
    chapterId: attempt.context.chapterId,
    state: "evaluating",
    totalScore: 0,
    maxScore: 0,
    percentage: 0,
    strengths: [],
    mistakes: [],
    missingPoints: [],
    improvementSuggestions: [],
    weakConcepts: [],
    perQuestion: [],
    engine: "heuristic",
    createdAt: now,
    updatedAt: now,
  };
  await saveEvaluation(seed);

  try {
    const images = await fetchAttemptImages(attemptId);
    const rubric = await fetchRubric();

    // Fetch model answers in parallel (best-effort).
    const perQuestion: EvaluationPerQuestion[] = [];
    for (const img of images) {
      let model: ModelAnswerDoc | null = null;
      if (attempt.context.subjectId && img.questionId) {
        try {
          model = await fetchModelAnswer(
            attempt.context.subjectId,
            img.questionId,
          );
        } catch {
          /* missing model answer is fine */
        }
      }
      perQuestion.push(evaluateOne(img, model, rubric));
    }

    const totalScore = +perQuestion.reduce((s, q) => s + q.score, 0).toFixed(2);
    const maxScore = perQuestion.reduce((s, q) => s + q.maxScore, 0) || 1;
    const percentage = +((totalScore / maxScore) * 100).toFixed(1);

    // Roll up qualitative feedback (dedupe + cap so the card stays tidy).
    const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 6);
    const strengths = uniq(perQuestion.flatMap((q) => q.strengths));
    const mistakes = uniq(perQuestion.flatMap((q) => q.mistakes));
    const missingPoints = uniq(perQuestion.flatMap((q) => q.missingPoints));
    const improvementSuggestions = uniq(
      perQuestion.flatMap((q) => q.improvementSuggestions),
    );

    // Weak concepts = missing keywords aggregated, ranked by frequency.
    const conceptCounts = new Map<string, number>();
    for (const q of perQuestion) {
      for (const k of q.missingKeywords) {
        conceptCounts.set(k, (conceptCounts.get(k) ?? 0) + 1);
      }
    }
    const weakConcepts = Array.from(conceptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic,
        severity: severityFromScore(
          Math.max(0, 100 - count * 25),
        ) as EvaluationSeverity,
      }));

    const summary =
      percentage >= 80
        ? "Strong attempt. Polish the missing terms for full marks."
        : percentage >= 50
          ? "Solid effort. Focus on missing keywords and structure."
          : "Needs revision. Re-read the chapter and rewrite weak answers.";

    const finalDoc: EvaluationDoc = {
      ...seed,
      state: "evaluated",
      totalScore,
      maxScore,
      percentage,
      summary,
      strengths,
      mistakes,
      missingPoints,
      improvementSuggestions,
      presentationFeedback: perQuestion[0]?.presentationFeedback,
      conceptualFeedback: perQuestion[0]?.conceptualFeedback,
      weakConcepts,
      perQuestion,
      rubricId: rubric.id,
      updatedAt: Date.now(),
    };
    await saveEvaluation(finalDoc);
    await setAttemptProcessingState(attemptId, "evaluated").catch(() => {});
    await updateWeaknessReport(finalDoc).catch(() => {});
    return finalDoc;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Evaluation failed";
    await setEvaluationState(attemptId, "error", { error: msg });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Weakness rollup
// ---------------------------------------------------------------------------

function weaknessDocId(userId: string, subjectId: string, chapterId?: string) {
  return chapterId
    ? `${userId}_${subjectId}_${chapterId}`
    : `${userId}_${subjectId}`;
}

export async function fetchWeaknessReport(
  userId: string,
  subjectId: string,
  chapterId?: string,
): Promise<WeaknessReportDoc | null> {
  const id = weaknessDocId(userId, subjectId, chapterId);
  const snap = await getDoc(doc(db, COLLECTIONS.WEAKNESS_REPORTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<WeaknessReportDoc, "id">) };
}

async function updateWeaknessReport(evalDoc: EvaluationDoc): Promise<void> {
  if (!evalDoc.subjectId) return;
  const id = weaknessDocId(
    evalDoc.userId,
    evalDoc.subjectId,
    evalDoc.chapterId,
  );
  const ref = doc(db, COLLECTIONS.WEAKNESS_REPORTS, id);
  const existing = await getDoc(ref);
  const prev = existing.exists()
    ? (existing.data() as Omit<WeaknessReportDoc, "id">)
    : null;

  const now = Date.now();
  const topicMap = new Map<
    string,
    { occurrences: number; severity: EvaluationSeverity; lastSeenAt: number }
  >();
  for (const t of prev?.topics ?? []) {
    topicMap.set(t.topic, {
      occurrences: t.occurrences,
      severity: t.severity,
      lastSeenAt: t.lastSeenAt,
    });
  }
  for (const w of evalDoc.weakConcepts) {
    const cur = topicMap.get(w.topic);
    topicMap.set(w.topic, {
      occurrences: (cur?.occurrences ?? 0) + 1,
      severity: w.severity, // latest wins; fine for a rollup
      lastSeenAt: now,
    });
  }

  const sampleSize = (prev?.sampleSize ?? 0) + 1;
  const avgPercentage = prev
    ? +(
        (prev.avgPercentage * prev.sampleSize + evalDoc.percentage) /
        sampleSize
      ).toFixed(1)
    : evalDoc.percentage;

  const next: WeaknessReportDoc = {
    id,
    userId: evalDoc.userId,
    subjectId: evalDoc.subjectId,
    chapterId: evalDoc.chapterId,
    topics: Array.from(topicMap.entries())
      .map(([topic, v]) => ({ topic, ...v }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 25),
    avgPercentage,
    sampleSize,
    updatedAt: now,
  };
  const clean: Record<string, unknown> = { ...next };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  await setDoc(ref, clean);
}

// ---------------------------------------------------------------------------
// Future hooks — kept as named exports so call sites stay stable.
// ---------------------------------------------------------------------------

/** Replace with a real LLM call when GPT/Gemini grading is wired up. */
export async function triggerLlmEvaluation(attemptId: string): Promise<void> {
  // For now, route through the heuristic so the UI works end-to-end.
  await runEvaluation(attemptId);
}