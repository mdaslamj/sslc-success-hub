/**
 * Vision + evaluation client for Karnataka SSLC paper evaluation.
 *
 * OCR: Gemini Vision direct (gateway MessageSchema is text-only).
 * Evaluation: Lovable AI Gateway via runSemanticReasoning (paper-evaluation).
 */
import { createServerFn } from "@tanstack/react-start";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { runSemanticReasoning } from "@/lib/semantic-reasoning/semantic-reasoning.functions";
import type { MarkSchemeQuestion } from "@/types/markScheme";

const OCR_MODEL = "gemini-2.0-flash";
const OCR_PROMPT = `You are reading a handwritten Karnataka SSLC student answer script. Extract all text you can read.
Include question numbers if visible.
Format: Q[number]: [extracted text]
If handwriting is unclear, write [unclear].
Do not add any explanation — only the extracted text.`;

export interface OcrRegion {
  questionId: string;
  text: string;
}

export interface OcrExtractionResult {
  rawText: string;
  regions: OcrRegion[];
}

export interface EvaluationResult {
  questionId: string;
  marksAwarded: number;
  marksTotal: number;
  pointsAddressed: string[];
  pointsMissed: string[];
  gapType: "conceptual" | "procedural" | "expression" | "none";
  gapDescription: string;
  feedbackToStudent: string;
  revisionTarget: string;
  confidence: "high" | "medium" | "low";
}

function geminiApiKey(): string {
  const key =
    (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined)?.trim() ||
    (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : undefined)?.trim() ||
    "";
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured for OCR");
  }
  return key;
}

function parseOcrRegions(rawText: string): OcrRegion[] {
  const regions: OcrRegion[] = [];
  const pattern = /^Q(\d+[a-z]?)\s*:\s*(.+)$/gim;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(rawText)) !== null) {
    regions.push({ questionId: `Q${match[1]}`, text: match[2].trim() });
  }
  return regions;
}

function parseEvaluationJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/** CALL TYPE 1 — OCR via Gemini Vision (server-side; gateway schema is text-only). */
export async function extractTextFromImage(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiApiKey());
  const model = genAI.getGenerativeModel({ model: OCR_MODEL });

  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    { text: OCR_PROMPT },
  ]);

  return result.response.text();
}

export async function extractTextFromImageStructured(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<OcrExtractionResult> {
  const rawText = await extractTextFromImage(base64Image, mimeType);
  return { rawText, regions: parseOcrRegions(rawText) };
}

const OcrServerInput = z.object({
  idToken: z.string().min(20).max(8000),
  base64Image: z.string().min(1).max(12_000_000),
  mimeType: z.enum(["image/jpeg", "image/png"]).optional(),
});

/** Server entry point for browser callers — keeps GEMINI_API_KEY off the client. */
export const extractTextFromImageServer = createServerFn({ method: "POST" })
  .inputValidator((input) => OcrServerInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    try {
      const text = await extractTextFromImage(data.base64Image, data.mimeType ?? "image/jpeg");
      return { ok: true, text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "OCR failed";
      return { ok: false, error: message };
    }
  });

/** CALL TYPE 2 — mark-scheme evaluation via Lovable gateway (text in / text out). */
export async function evaluateAnswer(
  extractedText: string,
  question: MarkSchemeQuestion,
  teacherMark?: number,
  idToken?: string,
): Promise<EvaluationResult> {
  const markPointsList = question.markPoints
    .map((p, i) => `Point ${i + 1} (${p.marks} mark): ${p.description}`)
    .join("\n");

  const prompt = `You are a Karnataka SSLC examiner.
Evaluate this student answer against the mark scheme.

QUESTION: ${question.questionText}
TOTAL MARKS: ${question.totalMarks}
SUBJECT: ${question.subjectId}

MARK SCHEME:
${markPointsList}

KEY TERMS REQUIRED: ${question.keyTerms.join(", ")}
${question.requiresDiagram ? `DIAGRAM REQUIRED: ${question.diagramDescription ?? "Yes"}` : ""}
${teacherMark !== undefined ? `TEACHER MARK: ${teacherMark}/${question.totalMarks}` : ""}

STUDENT ANSWER:
${extractedText}

RULES:
- Award partial credit for partial understanding
- Do not penalise for language errors if technical content is correct
- Feedback must be encouraging and specific
- Never say "wrong" — say what was missing

Respond ONLY in this JSON format, no other text:
{
  "marksAwarded": number,
  "pointsAddressed": ["description of point met"],
  "pointsMissed": ["description of point missed"],
  "gapType": "conceptual|procedural|expression|none",
  "gapDescription": "specific what was missing",
  "feedbackToStudent": "2-3 sentences, encouraging, specific",
  "revisionTarget": "exactly what to revise",
  "confidence": "high|medium|low"
}`;

  const response = await runSemanticReasoning({
    data: {
      idToken: idToken ?? "",
      taskType: "paper-evaluation",
      systemPrompt:
        "You are an expert Karnataka SSLC examiner. Always respond in valid JSON only.",
      messages: [{ role: "user", content: prompt }],
      responseFormat: "json_object",
      temperature: 0.2,
    },
  });

  if (!response.ok) {
    throw new Error(`Evaluation failed: ${response.error}`);
  }

  const parsed = parseEvaluationJson(response.content);

  return {
    questionId: question.id,
    marksAwarded: Math.min(Number(parsed.marksAwarded ?? 0), question.totalMarks),
    marksTotal: question.totalMarks,
    pointsAddressed: Array.isArray(parsed.pointsAddressed)
      ? (parsed.pointsAddressed as string[])
      : [],
    pointsMissed: Array.isArray(parsed.pointsMissed) ? (parsed.pointsMissed as string[]) : [],
    gapType: (parsed.gapType as EvaluationResult["gapType"]) ?? "none",
    gapDescription: String(parsed.gapDescription ?? ""),
    feedbackToStudent: String(parsed.feedbackToStudent ?? ""),
    revisionTarget: String(parsed.revisionTarget ?? ""),
    confidence: (parsed.confidence as EvaluationResult["confidence"]) ?? "medium",
  };
}

/** End-to-end pipeline: preprocess → OCR → safety → evaluate each question. */
export async function processAnswerPage(
  imageFile: File,
  questions: MarkSchemeQuestion[],
  idToken: string,
): Promise<EvaluationResult[]> {
  const { preprocessImage, fileToBase64 } = await import("@/lib/imagePreprocessor");
  const { checkContentSafety } = await import("@/lib/contentSafety");

  const { processedFile } = await preprocessImage(imageFile);
  const base64 = await fileToBase64(processedFile);

  const ocrResponse = await extractTextFromImageServer({
    data: { idToken, base64Image: base64, mimeType: "image/jpeg" },
  });

  if (!ocrResponse.ok) {
    throw new Error(`OCR failed: ${ocrResponse.error}`);
  }

  const extractedText = ocrResponse.text;

  const safety = checkContentSafety(extractedText);
  if (safety.action === "escalate") {
    throw new Error("SAFETY_ESCALATE");
  }

  const results: EvaluationResult[] = [];
  for (const question of questions) {
    try {
      const result = await evaluateAnswer(extractedText, question, undefined, idToken);
      results.push(result);
    } catch (err) {
      console.error("Eval failed for", question.id, err);
    }
  }

  return results;
}

/** Gateway vision support probe — documents current schema limitation. */
export const GATEWAY_SUPPORTS_VISION = false as const;
