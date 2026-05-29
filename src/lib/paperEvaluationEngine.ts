/**
 * Orchestrates paper evaluation: mark scheme load → multi-page OCR →
 * safety → per-question AI grading → report + mastery deltas.
 */
import {
  evaluateAnswer,
  extractTextFromImageServer,
  type EvaluationResult,
} from "@/lib/claudeVisionClient";
import { checkAllPages } from "@/lib/contentSafety";
import { SCIENCE_CHAPTER_SEED_SCHEMES } from "@/data/markSchemes/scienceSeed";
import { getMarkSchemesBySubject } from "@/lib/markSchemeRepository";
import { fileToBase64, preprocessImage } from "@/lib/imagePreprocessor";
import type { MarkSchemeQuestion } from "@/types/markScheme";
import type { StudentLearningProfile, Subject } from "@/types/aura-engine-contracts";
import { db } from "@/integrations/firebase/config";
import { doc, setDoc } from "firebase/firestore";

export type ExamType = "chapter" | "sa1" | "sa2" | "preparatory" | "board";

export class PaperEvaluationError extends Error {
  constructor(
    message: string,
    readonly code: "NO_MARK_SCHEME" | "OCR_FAILED" | "SAFETY_ESCALATE" | "SAFETY_PAUSE",
  ) {
    super(message);
    this.name = "PaperEvaluationError";
  }
}

export interface PaperSubmission {
  studentId: string;
  subjectId: string;
  examType: ExamType;
  pages: File[];
  teacherMarks?: Record<string, number>;
  idToken: string;
  /** Optional chapter filter for chapter-level exams. */
  chapterId?: string;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  marksAwarded: number;
  marksTotal: number;
  pointsAddressed: string[];
  pointsMissed: string[];
  gapType: "conceptual" | "procedural" | "expression" | "none";
  gapDescription: string;
  feedbackToStudent: string;
  revisionTarget: string;
  teacherMark?: number;
  marksMatch: boolean;
  confidence: EvaluationResult["confidence"];
}

export interface EvaluationReport {
  id: string;
  studentId: string;
  subjectId: string;
  examType: ExamType;
  date: string;
  totalMarks: number;
  scoredMarks: number;
  percentage: number;
  grade: string;
  questionResults: QuestionResult[];
  subjectSummary: {
    strongChapters: string[];
    weakChapters: string[];
    primaryGapType: "conceptual" | "procedural" | "expression" | "none";
    recommendedActions: string[];
  };
  masteryUpdates: Array<{
    chapterId: string;
    previousMastery: number;
    newMastery: number;
    delta: number;
  }>;
  processingStatus: "complete" | "partial" | "failed";
  extractedText: string;
  safetyPaused: boolean;
  createdAt: string;
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 35) return "D";
  return "F";
}

export function computeMasteryUpdate(
  currentMastery: number,
  marksAwarded: number,
  marksTotal: number,
): number {
  if (marksTotal <= 0) return currentMastery;
  const scorePercent = (marksAwarded / marksTotal) * 100;
  const newMastery = Math.round(currentMastery * 0.7 + scorePercent * 0.3);
  return Math.min(100, Math.max(0, newMastery));
}

function toAuraSubject(subjectId: string): Subject | null {
  if (subjectId === "math" || subjectId === "mathematics") return "math";
  if (subjectId === "science") return "science";
  if (subjectId === "social" || subjectId === "social-science" || subjectId === "social_science") {
    return "social";
  }
  return null;
}

function getChapterMastery(
  profile: StudentLearningProfile,
  subjectId: string,
  chapterId: string,
): number {
  const subject = toAuraSubject(subjectId);
  if (!subject) return 50;
  return profile.chapterMastery[subject]?.[chapterId]?.mastery ?? 50;
}

export async function loadMarkSchemeQuestions(
  submission: Pick<PaperSubmission, "subjectId" | "examType" | "chapterId">,
): Promise<MarkSchemeQuestion[]> {
  const remote = await getMarkSchemesBySubject(submission.subjectId);
  let questions = remote
    .filter((scheme) => scheme.examType === submission.examType)
    .flatMap((scheme) => scheme.questions);

  if (questions.length === 0 && submission.subjectId === "science") {
    questions = SCIENCE_CHAPTER_SEED_SCHEMES.filter(
      (scheme) => scheme.examType === submission.examType,
    ).flatMap((scheme) => scheme.questions);
  }

  if (submission.chapterId) {
    questions = questions.filter((q) => q.chapterIds.includes(submission.chapterId!));
  }

  return questions;
}

function extractAnswerForQuestion(combinedText: string, question: MarkSchemeQuestion): string {
  const idPatterns = [
    question.id,
    question.id.replace(/^ELEC_/, "").replace(/^LIGHT_/, ""),
    question.id.match(/Q\d+/i)?.[0],
  ].filter(Boolean) as string[];

  for (const pattern of idPatterns) {
    const regex = new RegExp(`${pattern}\\s*[:\\-]\\s*([\\s\\S]*?)(?=\\nQ\\d|$)`, "i");
    const match = combinedText.match(regex);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return combinedText;
}

async function ocrPages(pages: File[], idToken: string): Promise<string[]> {
  const texts: string[] = [];

  for (const page of pages) {
    const { processedFile } = await preprocessImage(page);
    const base64 = await fileToBase64(processedFile);

    const ocrResponse = await extractTextFromImageServer({
      data: { idToken, base64Image: base64, mimeType: "image/jpeg" },
    });

    if (!ocrResponse.ok) {
      throw new PaperEvaluationError(`OCR failed: ${ocrResponse.error}`, "OCR_FAILED");
    }

    texts.push(ocrResponse.text);
  }

  return texts;
}

function buildQuestionResult(
  question: MarkSchemeQuestion,
  evaluation: EvaluationResult,
  teacherMark?: number,
): QuestionResult {
  const marksMatch =
    teacherMark === undefined || Math.abs(evaluation.marksAwarded - teacherMark) <= 1;

  return {
    questionId: question.id,
    questionText: question.questionText,
    marksAwarded: evaluation.marksAwarded,
    marksTotal: evaluation.marksTotal,
    pointsAddressed: evaluation.pointsAddressed,
    pointsMissed: evaluation.pointsMissed,
    gapType: evaluation.gapType,
    gapDescription: evaluation.gapDescription,
    feedbackToStudent: evaluation.feedbackToStudent,
    revisionTarget: evaluation.revisionTarget,
    teacherMark,
    marksMatch,
    confidence: evaluation.confidence,
  };
}

function buildSubjectSummary(
  questionResults: QuestionResult[],
  questions: MarkSchemeQuestion[],
): EvaluationReport["subjectSummary"] {
  const chapterScores = new Map<string, { earned: number; total: number }>();

  for (const result of questionResults) {
    const question = questions.find((q) => q.id === result.questionId);
    for (const chapterId of question?.chapterIds ?? []) {
      const entry = chapterScores.get(chapterId) ?? { earned: 0, total: 0 };
      entry.earned += result.marksAwarded;
      entry.total += result.marksTotal;
      chapterScores.set(chapterId, entry);
    }
  }

  const strongChapters: string[] = [];
  const weakChapters: string[] = [];

  for (const [chapterId, { earned, total }] of chapterScores) {
    if (total <= 0) continue;
    const pct = (earned / total) * 100;
    if (pct >= 70) strongChapters.push(chapterId);
    if (pct < 50) weakChapters.push(chapterId);
  }

  const gapCounts = new Map<QuestionResult["gapType"], number>();
  for (const result of questionResults) {
    if (result.gapType === "none") continue;
    gapCounts.set(result.gapType, (gapCounts.get(result.gapType) ?? 0) + 1);
  }

  let primaryGapType: QuestionResult["gapType"] = "none";
  let maxCount = 0;
  for (const [gapType, count] of gapCounts) {
    if (count > maxCount) {
      maxCount = count;
      primaryGapType = gapType;
    }
  }

  const recommendedActions = [
    ...new Set(
      questionResults
        .filter((r) => r.marksAwarded < r.marksTotal * 0.6)
        .map((r) => r.revisionTarget)
        .filter(Boolean),
    ),
  ].slice(0, 5);

  return { strongChapters, weakChapters, primaryGapType, recommendedActions };
}

function buildMasteryUpdates(
  profile: StudentLearningProfile,
  questionResults: QuestionResult[],
  questions: MarkSchemeQuestion[],
): EvaluationReport["masteryUpdates"] {
  const byChapter = new Map<string, { earned: number; total: number }>();

  for (const result of questionResults) {
    const question = questions.find((q) => q.id === result.questionId);
    for (const chapterId of question?.chapterIds ?? []) {
      const entry = byChapter.get(chapterId) ?? { earned: 0, total: 0 };
      entry.earned += result.marksAwarded;
      entry.total += result.marksTotal;
      byChapter.set(chapterId, entry);
    }
  }

  const updates: EvaluationReport["masteryUpdates"] = [];

  for (const [chapterId, { earned, total }] of byChapter) {
    const subjectId =
      questions.find((q) => q.chapterIds.includes(chapterId))?.subjectId ?? "science";
    const previousMastery = getChapterMastery(profile, subjectId, chapterId);
    const newMastery = computeMasteryUpdate(previousMastery, earned, total);
    updates.push({
      chapterId,
      previousMastery,
      newMastery,
      delta: newMastery - previousMastery,
    });
  }

  return updates;
}

export async function evaluatePaper(
  submission: PaperSubmission,
  currentProfile: StudentLearningProfile,
): Promise<EvaluationReport> {
  const createdAt = new Date().toISOString();
  const reportId = `eval_${submission.studentId}_${submission.subjectId}_${Date.now()}`;

  const questions = await loadMarkSchemeQuestions(submission);
  if (questions.length === 0) {
    throw new PaperEvaluationError(
      `No mark scheme found for ${submission.subjectId} (${submission.examType})`,
      "NO_MARK_SCHEME",
    );
  }

  if (submission.pages.length === 0) {
    throw new PaperEvaluationError("At least one answer page is required", "OCR_FAILED");
  }

  const pageTexts = await ocrPages(submission.pages, submission.idToken);
  const extractedText = pageTexts.join("\n\n--- PAGE BREAK ---\n\n");

  const safety = checkAllPages(pageTexts);
  if (safety.action === "escalate") {
    throw new PaperEvaluationError("Content safety escalation required", "SAFETY_ESCALATE");
  }

  const questionResults: QuestionResult[] = [];
  let evalFailures = 0;

  for (const question of questions) {
    const teacherMark = submission.teacherMarks?.[question.id];
    const answerText = extractAnswerForQuestion(extractedText, question);

    try {
      const evaluation = await evaluateAnswer(
        answerText,
        question,
        teacherMark,
        submission.idToken,
      );
      questionResults.push(buildQuestionResult(question, evaluation, teacherMark));
    } catch (err) {
      evalFailures += 1;
      console.error("Eval failed for", question.id, err);
    }
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.totalMarks, 0);
  const scoredMarks = questionResults.reduce((sum, r) => sum + r.marksAwarded, 0);
  const percentage = totalMarks > 0 ? Math.round((scoredMarks / totalMarks) * 100) : 0;

  let processingStatus: EvaluationReport["processingStatus"] = "complete";
  if (questionResults.length === 0) processingStatus = "failed";
  else if (evalFailures > 0 || questionResults.length < questions.length) {
    processingStatus = "partial";
  }

  const masteryUpdates = buildMasteryUpdates(currentProfile, questionResults, questions);

  return {
    id: reportId,
    studentId: submission.studentId,
    subjectId: submission.subjectId,
    examType: submission.examType,
    date: createdAt.slice(0, 10),
    totalMarks,
    scoredMarks,
    percentage,
    grade: calculateGrade(percentage),
    questionResults,
    subjectSummary: buildSubjectSummary(questionResults, questions),
    masteryUpdates,
    processingStatus,
    extractedText,
    safetyPaused: safety.action === "pause",
    createdAt,
  };
}

const EVALUATION_REPORTS_COLLECTION = "evaluation_reports";

export async function saveEvaluationReport(report: EvaluationReport): Promise<void> {
  await setDoc(doc(db, EVALUATION_REPORTS_COLLECTION, report.id), report);
}
