import type { MathCommonMistakeDoc } from "@/integrations/firebase/types";

export type DetectedMistake = {
  mistake: MathCommonMistakeDoc;
  matchedTriggers: string[];
};

/** Scan OCR/extracted text for known common-mistake patterns. */
export function detectMistakes(
  text: string,
  catalog: MathCommonMistakeDoc[],
): DetectedMistake[] {
  const haystack = text.toLowerCase();
  const hits: DetectedMistake[] = [];
  for (const m of catalog) {
    const matched = m.triggerKeywords.filter((t) =>
      haystack.includes(t.toLowerCase()),
    );
    if (matched.length > 0) hits.push({ mistake: m, matchedTriggers: matched });
  }
  return hits;
}