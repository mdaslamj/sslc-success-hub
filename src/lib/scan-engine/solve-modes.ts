import type { SolveMode } from "@/integrations/firebase/types";

export const SCAN_GUARDRAIL = `You are Aura, an SSLC (Karnataka board) study companion.
You are reading a student's photographed question. The OCR text below may
contain small errors — infer the intended question, but never invent values
the student didn't write. Be calm, encouraging, and concise. Mathematics
should use plain notation that renders in a chat bubble (avoid raw LaTeX —
use words or simple symbols like ^, /, sqrt()).`;

export function solveSystemPrompt(mode: SolveMode, language: "en" | "kn"): string {
  const lang =
    language === "kn"
      ? "Reply primarily in clear, simple English BUT translate every key term into Kannada in parentheses, e.g. 'slope (ಇಳಿಜಾರು)'. Keep numbers and math symbols universal."
      : "Reply in clear, simple English suitable for an SSLC student.";

  const modeText: Record<SolveMode, string> = {
    quick:
      "Give ONLY the final answer in one short sentence, then a single line listing the key formula or rule used. Maximum 3 lines.",
    step_by_step: [
      "Show the full solution as numbered steps.",
      "Format STRICTLY as:",
      "Step 1: <what to do> — <one short reason>",
      "Step 2: ...",
      "End with: Final answer: <value with units>.",
      "Keep each step to one short sentence so a tired student can follow.",
    ].join("\n"),
    hint:
      "Output exactly three hints separated by '---'. Hint 1 = a gentle nudge (one sentence, do NOT reveal the answer). Hint 2 = the next single step. Hint 3 = the full solution ending in 'Final answer: <value>'.",
    board: [
      "Write the answer the way a Karnataka SSLC examiner expects, in this exact structure:",
      "Given:",
      "To find:",
      "Formula:",
      "Solution: (numbered working)",
      "Answer:",
      "Use the marking-scheme phrasing students are awarded marks for.",
    ].join("\n"),
    kannada:
      "Explain the concept and solution in simple bilingual style: each English sentence is followed by its Kannada translation in parentheses. Use Kannada script for the translation.",
  };

  return `${SCAN_GUARDRAIL}\n\n${lang}\n\n${modeText[mode]}`;
}

export function parseStepByStep(content: string): {
  steps: { order: number; text: string }[];
  finalAnswer?: string;
} {
  const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const steps: { order: number; text: string }[] = [];
  let finalAnswer: string | undefined;
  for (const l of lines) {
    const m = l.match(/^step\s*(\d+)\s*[:\-.]\s*(.+)$/i);
    if (m) {
      steps.push({ order: Number(m[1]), text: m[2].trim() });
      continue;
    }
    const fm = l.match(/^final\s*answer\s*[:\-]\s*(.+)$/i);
    if (fm) finalAnswer = fm[1].trim();
  }
  return { steps, finalAnswer };
}

export function parseHints(
  content: string,
): { level: "nudge" | "guided" | "full"; text: string }[] {
  const parts = content
    .split(/\n?-{3,}\n?/)
    .map((p) => p.trim())
    .filter(Boolean);
  const labels: Array<"nudge" | "guided" | "full"> = ["nudge", "guided", "full"];
  return parts.slice(0, 3).map((text, i) => ({ level: labels[i], text }));
}

export function solveModeLabel(mode: SolveMode): string {
  return (
    {
      quick: "Quick answer",
      step_by_step: "Step by step",
      hint: "Hint mode",
      board: "Board method",
      kannada: "Kannada",
    } as const
  )[mode];
}