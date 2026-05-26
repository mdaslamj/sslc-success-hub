import type { Subject } from "@/types/question";

export type BlueprintChapter = {
  id: string;
  name: string;
  priority?: "critical" | "high" | "medium" | "low";
};

export type SubjectBlueprint = {
  subject: Subject;
  chapters: BlueprintChapter[];
};

/**
 * Phase 4 will wire this to SSLC blueprint JSON.
 * Returns null until blueprint data is loaded — analytics degrade gracefully.
 */
export function getBlueprint(_subject: Subject): SubjectBlueprint | null {
  return null;
}
