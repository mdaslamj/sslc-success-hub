import type {
  ScoreProjectionOutput,
  StudentLearningProfile,
  Subject,
} from "@/types/aura-engine-contracts";

export type SubjectMasteryView = Record<
  Subject,
  { mastery: number; predicted: number }
> & {
  overall: number;
};

const SUBJECTS: Subject[] = ["math", "science", "social"];

function averageMastery(
  chapters: StudentLearningProfile["chapterMastery"][Subject] | undefined,
): number {
  if (!chapters) return 0;
  const values = Object.entries(chapters)
    .filter(([key]) => !key.startsWith("_"))
    .map(([, entry]) => entry.mastery);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Placeholder mastery view — future: masteryEngine with decay + spaced repetition. */
export function computeSubjectMasteryView(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  projection: ScoreProjectionOutput,
): SubjectMasteryView {
  const view = {} as SubjectMasteryView;

  for (const subject of SUBJECTS) {
    const predicted = projection.bySubject[subject]?.percentage ?? 0;
    view[subject] = {
      mastery: averageMastery(chapterMastery[subject]),
      predicted: Math.round(predicted),
    };
  }

  const overallValues = SUBJECTS.map((s) => view[s].mastery);
  view.overall = Math.round(
    overallValues.reduce((a, b) => a + b, 0) / overallValues.length,
  );

  return view;
}
