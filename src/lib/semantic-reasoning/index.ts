export * from "./grounding";
export * from "./prompts";
export * from "./semantic-reasoning.functions";

/** Safe JSON parse for the semantic evaluator's JSON-mode response. */
export function safeParseSemanticEvaluation(raw: string): {
  verdict?: "equivalent" | "alternate_method" | "partially_correct" | "incorrect";
  confidence?: number;
  alternateMethod?: string;
  reasoningSummary?: string;
  mistakeInterpretations?: Array<{
    label: string;
    explanation: string;
    severity: "low" | "medium" | "high";
  }>;
  feedback?: string;
} | null {
  try {
    // Strip ```json fences if a model returned them despite json_object mode.
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}