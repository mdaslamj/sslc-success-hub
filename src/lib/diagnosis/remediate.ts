import type {
  RemediationAction,
  RemediationPlanDoc,
  RemediationRecommendations,
  WeaknessLayer,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";
import { topWeaknessLayer } from "./diagnose";

export type RemediateInput = {
  userId: string;
  profile: WeaknessProfileDoc;
  /** Optional chapter title for nicer copy. */
  chapterTitle?: string;
  /** Optional candidate formula ids to drill (weakest first). */
  weakFormulaIds?: string[];
  /** Optional related-chapter ids the engine can suggest revisiting. */
  relatedChapterIds?: string[];
  /** True when this chapter has high board frequency. */
  isBoardPriority?: boolean;
};

function actionsForLayer(
  layer: WeaknessLayer,
  chapterId: string,
  chapterTitle: string,
): RemediationAction[] {
  const base = `/subjects/math/${chapterId}`;
  switch (layer) {
    case "conceptual":
      return [
        {
          kind: "targeted_revision",
          title: `Re-read core concepts: ${chapterTitle}`,
          description: "Walk through the concept map and worked examples before retrying questions.",
          route: base,
          priority: 5,
          estimatedMinutes: 25,
        },
      ];
    case "procedural":
      return [
        {
          kind: "targeted_revision",
          title: "Step-by-step solution drills",
          description: "Solve 5 medium questions while writing every intermediate step.",
          route: base,
          priority: 4,
          estimatedMinutes: 30,
        },
      ];
    case "computational":
      return [
        {
          kind: "easier_practice",
          title: "Computation accuracy set",
          description: "Practice 10 quick arithmetic-heavy MCQs to reduce calculation slips.",
          route: base,
          priority: 3,
          estimatedMinutes: 15,
        },
      ];
    case "presentation":
      return [
        {
          kind: "targeted_revision",
          title: "Answer presentation checklist",
          description: "Re-write last attempt using the model-answer structure (given → formula → working → answer).",
          route: base,
          priority: 3,
          estimatedMinutes: 20,
        },
      ];
    case "behavioural":
      return [
        {
          kind: "targeted_revision",
          title: "Timed micro-session",
          description: "Run a 20-min focused timer; finish 3 questions without breaks.",
          route: "/focus",
          priority: 2,
          estimatedMinutes: 20,
        },
      ];
  }
}

/**
 * Build a personalized remediation plan from a weakness profile. Pure.
 */
export function buildRemediationPlan(input: RemediateInput): RemediationPlanDoc {
  const { userId, profile, chapterTitle = profile.chapterId } = input;
  const top = topWeaknessLayer(profile);

  const recs: RemediationRecommendations = {
    targetedRevision: actionsForLayer(top, profile.chapterId, chapterTitle),
    formulaDrills: [],
    easierPractice: [],
    chapterRecommendations: [],
    boardPriorityRevision: [],
  };

  // Formula drills — derived from weakest formula ids (caller supplies).
  if (input.weakFormulaIds?.length) {
    recs.formulaDrills.push({
      kind: "formula_drill",
      title: "Formula recall drill",
      description: `Drill ${input.weakFormulaIds.length} weak formulas with timed flashcards.`,
      refIds: input.weakFormulaIds.slice(0, 6),
      route: `/subjects/math/${profile.chapterId}`,
      priority: 4,
      estimatedMinutes: 10,
    });
  }

  // Easier practice when confidence is very low.
  if (profile.confidenceScore < 40) {
    recs.easierPractice.push({
      kind: "easier_practice",
      title: "Restart with basics",
      description: "Start with 1-mark and 2-mark questions to rebuild confidence before retrying harder ones.",
      route: `/subjects/math/${profile.chapterId}`,
      priority: 5,
      estimatedMinutes: 25,
    });
  }

  // Cross-chapter recommendations.
  if (input.relatedChapterIds?.length) {
    recs.chapterRecommendations.push({
      kind: "chapter_recommendation",
      title: "Strengthen pre-requisites",
      description: "These chapters share concepts with the current weak area — revise them next.",
      refIds: input.relatedChapterIds.slice(0, 4),
      priority: 3,
      estimatedMinutes: 30,
    });
  }

  // Board-priority revision for high-frequency chapters with risk.
  if (input.isBoardPriority && profile.marksAtRisk > 2) {
    recs.boardPriorityRevision.push({
      kind: "board_priority_revision",
      title: "Board-priority revision",
      description: `~${profile.marksAtRisk} marks at risk. Solve the last 5 years of board questions for this chapter.`,
      route: `/subjects/math/${profile.chapterId}`,
      priority: 5,
      estimatedMinutes: 45,
    });
  }

  const now = Date.now();
  return {
    id: `${profile.chapterId}_${now}`,
    userId,
    chapterId: profile.chapterId,
    subjectId: profile.subjectId,
    recommendations: recs,
    status: "pending",
    triggerSnapshot: {
      confidenceScore: profile.confidenceScore,
      marksAtRisk: profile.marksAtRisk,
      topLayer: top,
    },
    createdAt: now,
    updatedAt: now,
  };
}