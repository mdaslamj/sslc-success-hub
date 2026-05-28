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

export type MasterySessionType = "new-concept" | "practice" | "revision" | "mock";

export type MasterySession = {
  id?: string;
  chapterId: string;
  subjectId: string;
  type: MasterySessionType;
  duration: number;
  score?: number | null;
};

export type AdaptiveChapter = {
  id: string;
  subjectId: string;
  name: string;
  mastery: number;
  blueprintMarks: number;
};

export type AdaptiveSubject = {
  name: string;
  color: string;
  mastery: number;
  predicted: number;
  totalMarks: number;
};

export type AdaptiveAcademicState = {
  chapters: AdaptiveChapter[];
  subjects: Record<string, AdaptiveSubject>;
};

export type CausalityChain = {
  nodes: Array<{
    id: string;
    icon: string;
    label: string;
    value: string;
    sub: string;
    color: string;
  }>;
  needsReplan: boolean;
  subjectName: string;
  subjectColor: string;
  summary: string;
};

export type SessionCompletionResult = {
  updatedChapter: AdaptiveChapter;
  updatedSubject: AdaptiveSubject & { mastery: number; predicted: number };
  updatedChapters: AdaptiveChapter[];
  chapterMasteryDelta: number;
  subjectMasteryDelta: number;
  probabilityDelta: number;
  causalityChain: CausalityChain;
  needsReplan: boolean;
  replanTrigger: {
    subjectId: string;
    probabilityDelta: number;
    newPredicted: number;
  } | null;
};

const SUBJECTS: Subject[] = ["math", "science", "social"];

const BASE_MASTERY_GAIN: Record<MasterySessionType, number> = {
  "new-concept": 12,
  practice: 9,
  revision: 6,
  mock: 8,
};

const REPLAN_THRESHOLD = 1.8;
const PROBABILITY_SENSITIVITY = 0.85;

function masteryMultiplier(currentMastery: number): number {
  if (currentMastery < 30) return 1.4;
  if (currentMastery < 50) return 1.2;
  if (currentMastery < 65) return 1.0;
  if (currentMastery < 80) return 0.8;
  return 0.5;
}

function burnoutMasteryPenalty(burnoutScore: number): number {
  if (burnoutScore < 30) return 1.0;
  if (burnoutScore < 60) return 0.85;
  if (burnoutScore < 80) return 0.7;
  return 0.5;
}

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

/** Session-type mastery gain with burnout and score modulation. */
export function computeMasteryDelta(
  session: MasterySession,
  currentMastery: number,
  burnoutScore = 0,
): number {
  const base = BASE_MASTERY_GAIN[session.type] ?? 8;
  const levelMult = masteryMultiplier(currentMastery);
  const burnoutMod = burnoutMasteryPenalty(burnoutScore);
  const scoreMod =
    session.score != null ? 0.5 + (session.score / 100) * 0.8 : 1.0;
  const delta = base * levelMult * burnoutMod * scoreMod;
  return parseFloat(Math.min(delta, 20).toFixed(1));
}

export function updateChapterMastery(
  chapterId: string,
  delta: number,
  chapters: AdaptiveChapter[],
): {
  chapter: AdaptiveChapter;
  previousMastery: number;
  newMastery: number;
  delta: number;
} | null {
  const chapter = chapters.find((ch) => ch.id === chapterId);
  if (!chapter) return null;

  const previousMastery = chapter.mastery;
  const newMastery = parseFloat(
    Math.min(chapter.mastery + delta, 100).toFixed(1),
  );

  return {
    chapter: { ...chapter, mastery: newMastery },
    previousMastery,
    newMastery,
    delta,
  };
}

export function recomputeSubjectMastery(
  subjectId: string,
  chapters: AdaptiveChapter[],
  subjects: Record<string, AdaptiveSubject>,
): { previousMastery: number; newMastery: number; delta: number } | null {
  const subjectChapters = chapters.filter((ch) => ch.subjectId === subjectId);
  const subject = subjects[subjectId];
  if (!subjectChapters.length || !subject) return null;

  const totalWeight = subjectChapters.reduce(
    (sum, ch) => sum + ch.blueprintMarks,
    0,
  );
  const weightedSum = subjectChapters.reduce(
    (sum, ch) => sum + ch.mastery * ch.blueprintMarks,
    0,
  );
  const newMastery = parseFloat((weightedSum / totalWeight).toFixed(1));
  const previousMastery = subject.mastery;
  const delta = parseFloat((newMastery - previousMastery).toFixed(1));

  return { previousMastery, newMastery, delta };
}

/**
 * Display-only predicted shift for causality UI — not a replacement for
 * `computeProbabilitySnapshot` in probabilityEngine.ts.
 */
export function computeMasteryProbabilityShift(
  masteryDelta: number,
  blueprintMarks: number,
  totalMarks: number,
  subject: AdaptiveSubject,
): { previousPredicted: number; newPredicted: number; delta: number } {
  const chapterWeight = blueprintMarks / totalMarks;
  const rawShift = masteryDelta * chapterWeight * PROBABILITY_SENSITIVITY;
  const delta = parseFloat(rawShift.toFixed(1));
  const previousPredicted = subject.predicted;
  const newPredicted = parseFloat(
    Math.min(subject.predicted + delta, 99).toFixed(1),
  );

  return { previousPredicted, newPredicted, delta };
}

export function buildCausalityChain(input: {
  session: MasterySession;
  chapterName: string;
  subjectName: string;
  subjectColor: string;
  chapterMasteryDelta: number;
  previousChapterMastery: number;
  newChapterMastery: number;
  previousSubjectMastery: number;
  newSubjectMastery: number;
  previousPredicted: number;
  newPredicted: number;
  needsReplan: boolean;
  replanSummary?: string | null;
}): CausalityChain {
  const {
    session,
    chapterName,
    subjectName,
    subjectColor,
    chapterMasteryDelta,
    previousChapterMastery,
    newChapterMastery,
    previousPredicted,
    newPredicted,
    needsReplan,
    replanSummary = null,
  } = input;

  return {
    nodes: [
      {
        id: "session",
        icon: "✓",
        label: "Session done",
        value: chapterName,
        sub: `${session.duration} min · ${session.type}`,
        color: subjectColor,
      },
      {
        id: "mastery",
        icon: "↑",
        label: "Chapter mastery",
        value: `${previousChapterMastery}% → ${newChapterMastery}%`,
        sub: `+${chapterMasteryDelta.toFixed(1)}% gained`,
        color: subjectColor,
      },
      {
        id: "subject",
        icon: "📈",
        label: `${subjectName} probability`,
        value: `${previousPredicted}% → ${newPredicted}%`,
        sub:
          previousPredicted < newPredicted
            ? `+${(newPredicted - previousPredicted).toFixed(1)}% shift`
            : "Holding steady",
        color: subjectColor,
      },
      {
        id: "plan",
        icon: needsReplan ? "🔄" : "✓",
        label: needsReplan ? "Plan rebalanced" : "Plan on track",
        value: needsReplan ? "Tomorrow updated" : "No change needed",
        sub:
          replanSummary ??
          (needsReplan
            ? "Aura has adjusted tomorrow's sessions"
            : "Current plan is still optimal"),
        color: needsReplan ? "#8B5CF6" : "#4ADE80",
      },
    ],
    needsReplan,
    subjectName,
    subjectColor,
    summary: needsReplan
      ? `Aura has rebalanced your plan. ${subjectName} probability moved ${previousPredicted}% → ${newPredicted}%.`
      : `${subjectName} probability moved ${previousPredicted}% → ${newPredicted}%. Plan is still optimal.`,
  };
}

export function processSessionCompletion(
  session: MasterySession,
  currentState: AdaptiveAcademicState,
  burnoutScore = 0,
): SessionCompletionResult | null {
  const { chapters, subjects } = currentState;
  const chapter = chapters.find((ch) => ch.id === session.chapterId);
  const subject = subjects[session.subjectId];

  if (!chapter || !subject) return null;

  const chapterDelta = computeMasteryDelta(session, chapter.mastery, burnoutScore);
  const chapterUpdate = updateChapterMastery(
    session.chapterId,
    chapterDelta,
    chapters,
  );
  if (!chapterUpdate) return null;

  const updatedChapters = chapters.map((ch) =>
    ch.id === session.chapterId ? chapterUpdate.chapter : ch,
  );

  const subjectMasteryUpdate = recomputeSubjectMastery(
    session.subjectId,
    updatedChapters,
    subjects,
  );
  if (!subjectMasteryUpdate) return null;

  const probShift = computeMasteryProbabilityShift(
    subjectMasteryUpdate.delta,
    chapter.blueprintMarks,
    subject.totalMarks,
    subject,
  );

  const needsReplan = probShift.delta > REPLAN_THRESHOLD;

  const causalityChain = buildCausalityChain({
    session,
    chapterName: chapter.name,
    subjectName: subject.name,
    subjectColor: subject.color,
    chapterMasteryDelta: chapterDelta,
    previousChapterMastery: chapterUpdate.previousMastery,
    newChapterMastery: chapterUpdate.newMastery,
    previousSubjectMastery: subjectMasteryUpdate.previousMastery,
    newSubjectMastery: subjectMasteryUpdate.newMastery,
    previousPredicted: probShift.previousPredicted,
    newPredicted: probShift.newPredicted,
    needsReplan,
  });

  return {
    updatedChapter: chapterUpdate.chapter,
    updatedSubject: {
      ...subject,
      mastery: subjectMasteryUpdate.newMastery,
      predicted: probShift.newPredicted,
    },
    updatedChapters,
    chapterMasteryDelta: chapterDelta,
    subjectMasteryDelta: subjectMasteryUpdate.delta,
    probabilityDelta: probShift.delta,
    causalityChain,
    needsReplan,
    replanTrigger: needsReplan
      ? {
          subjectId: session.subjectId,
          probabilityDelta: probShift.delta,
          newPredicted: probShift.newPredicted,
        }
      : null,
  };
}

export function shouldReplanWeek(
  todaysResults: Array<SessionCompletionResult | null>,
): boolean {
  const totalShift = todaysResults.reduce(
    (sum, result) => sum + (result?.probabilityDelta ?? 0),
    0,
  );
  return totalShift > 3.5;
}

export function generateReplanSummary(
  subjectName: string,
  previousPredicted: number,
  newPredicted: number,
  trigger: "improvement" | "decline" | "new-gap" = "improvement",
): string {
  const delta = Math.abs(newPredicted - previousPredicted).toFixed(1);
  if (trigger === "improvement") {
    return `${subjectName} moved +${delta}% today. Aura has reduced tomorrow's ${subjectName} load and added capacity for weaker subjects.`;
  }
  if (trigger === "decline") {
    return `${subjectName} dropped ${delta}%. Aura has added a recovery session tomorrow.`;
  }
  return `A new gap opened in ${subjectName}. Aura has reordered this week to address it.`;
}
