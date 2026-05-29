export interface SafetyCheckResult {
  safe: boolean;
  flagged: boolean;
  category?: "self-harm" | "distress" | "abuse" | "other";
  confidence: "high" | "medium" | "low";
  action: "proceed" | "pause" | "escalate";
}

const DISTRESS_PATTERNS = [
  /don't want to (live|exist|be here)/i,
  /want to (die|end it|disappear)/i,
  /no point in (living|trying|anything)/i,
  /nobody (cares|would miss me)/i,
  /can't (go on|take it|do this anymore)/i,
  /harm (myself|my self)/i,
  /rather (die|be dead) than (fail|give exam)/i,
  /exam (will kill|is killing) me/i,
];

const ACADEMIC_DISTRESS_PATTERNS = [
  /i (give up|quit|cant do this)/i,
  /i am (stupid|dumb|worthless|useless)/i,
  /i will (never pass|always fail)/i,
];

export function checkContentSafety(text: string): SafetyCheckResult {
  if (!text || text.trim().length < 10) {
    return { safe: true, flagged: false, action: "proceed", confidence: "high" };
  }

  for (const pattern of DISTRESS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        flagged: true,
        category: "self-harm",
        confidence: "high",
        action: "escalate",
      };
    }
  }

  for (const pattern of ACADEMIC_DISTRESS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: true,
        flagged: true,
        category: "distress",
        confidence: "medium",
        action: "pause",
      };
    }
  }

  return { safe: true, flagged: false, action: "proceed", confidence: "high" };
}

export function checkAllPages(pages: string[]): SafetyCheckResult {
  for (const page of pages) {
    const result = checkContentSafety(page);
    if (result.action === "escalate") return result;
    if (result.action === "pause") return result;
  }
  return { safe: true, flagged: false, action: "proceed", confidence: "high" };
}
