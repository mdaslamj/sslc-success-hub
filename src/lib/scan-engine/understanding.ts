import type { ScanUnderstanding } from "@/integrations/firebase/types";

export const UNDERSTANDING_SYSTEM = `You are an SSLC academic classifier.
Given a scanned question, classify it. Reply STRICTLY as JSON matching:
{
  "subject": string,                 // e.g. "Mathematics", "Science"
  "chapterTitle": string,            // best guess chapter name, or ""
  "difficulty": "easy"|"medium"|"hard",
  "boardRelevance": number,          // 0..100 — match to Karnataka SSLC board patterns
  "concepts": string[],              // 1-5 short concept tags
  "formulas": string[],              // detected/required formulas (short)
  "keywords": string[],              // 3-6 important keywords
  "diagrams": string[],              // empty array if no diagram
  "language": "en"|"kn"|"mixed",
  "summary": string                  // ONE short sentence describing the question
}
Never include prose outside the JSON.`;

const EMPTY: ScanUnderstanding = {
  difficulty: "unknown",
  boardRelevance: 50,
  concepts: [],
  formulas: [],
  keywords: [],
};

export function parseUnderstanding(raw: string): ScanUnderstanding {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    const j = JSON.parse(cleaned) as Partial<ScanUnderstanding>;
    return {
      subject: typeof j.subject === "string" ? j.subject : undefined,
      chapterTitle: typeof j.chapterTitle === "string" ? j.chapterTitle : undefined,
      difficulty:
        j.difficulty === "easy" || j.difficulty === "medium" || j.difficulty === "hard"
          ? j.difficulty
          : "unknown",
      boardRelevance:
        typeof j.boardRelevance === "number"
          ? Math.max(0, Math.min(100, Math.round(j.boardRelevance)))
          : 50,
      concepts: Array.isArray(j.concepts) ? j.concepts.slice(0, 6) : [],
      formulas: Array.isArray(j.formulas) ? j.formulas.slice(0, 6) : [],
      keywords: Array.isArray(j.keywords) ? j.keywords.slice(0, 8) : [],
      diagrams: Array.isArray(j.diagrams) ? j.diagrams.slice(0, 4) : [],
      language: typeof j.language === "string" ? j.language : "en",
      summary: typeof j.summary === "string" ? j.summary : undefined,
    };
  } catch {
    return EMPTY;
  }
}