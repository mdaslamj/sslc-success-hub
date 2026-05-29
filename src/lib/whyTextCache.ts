import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";

export type MasteryLevel = "Novice" | "Intermediate" | "Advanced";

export const MASTERY_LEVELS: readonly MasteryLevel[] = [
  "Novice",
  "Intermediate",
  "Advanced",
] as const;

export function getWhyTextKey(chapterId: string, level: MasteryLevel): string {
  return `${chapterId}_${level.toLowerCase()}`;
}

/** Map numeric mastery % to a pre-computed cache tier. */
export function masteryToLevel(mastery: number): MasteryLevel {
  const m = Math.max(0, Math.min(100, mastery ?? 50));
  if (m < 50) return "Novice";
  if (m < 70) return "Intermediate";
  return "Advanced";
}

export async function getWhyText(
  chapterId: string,
  level: MasteryLevel,
  fallback: string,
): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "why_texts", getWhyTextKey(chapterId, level)));
    if (snap.exists()) return snap.data().text as string;
  } catch {
    // Firestore unavailable — use fallback
  }
  return fallback;
}
