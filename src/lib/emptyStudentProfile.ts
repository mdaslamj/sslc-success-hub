import { loadSeedBlueprint } from "@/engines/scoreProjection";
import type {
  AnalyticsDimension,
  StudentLearningProfile,
  Subject,
  Trend,
} from "@/types/aura-engine-contracts";

const SUBJECTS: Subject[] = ["math", "science", "social"];

function emptyDimension(label: string, description: string, signals: string[]): AnalyticsDimension {
  return {
    score: 0,
    label,
    description,
    trend: "stable" as Trend,
    signals,
  };
}

/** Blank academic profile for new students — no mastery, sessions, or demo analytics. */
export function createEmptyStudentProfile(
  overrides?: Partial<Pick<StudentLearningProfile, "student" | "subjectTargets">>,
): StudentLearningProfile {
  const today = new Date().toISOString().slice(0, 10);

  return {
    _meta: {
      schema: "AuraStudentLearningProfile",
      version: "2.0",
      board: "Karnataka SSLC",
      year: "2025-26",
      generatedAt: new Date().toISOString(),
    },
    student: {
      id: "",
      name: "",
      grade: "Class X",
      school: "",
      enrolledOn: today,
      targetScore: 75,
      daysToExam: 0,
      ...overrides?.student,
    },
    archetype: {
      current: "average",
      inferredAt: today,
      inferenceMethod: "behavioral",
      behavioralSignals: {
        overallMastery: 0,
        sessionCompletionRate: 0,
        accuracyTrend: "stable",
        recoverySpeed: "moderate",
        streakDiscipline: 0,
        panicIndex: 0,
        helpSeekingFrequency: 0,
        retryBehavior: 0,
        examPerformanceVsPractice: 0,
        timeOnHardProblems: 0,
      },
      archetypeScore: 0,
      archetypeBand: "average",
      archetypeHistory: [],
    },
    analytics: {
      overallHealthScore: 0,
      lastUpdated: today,
      dimensions: {
        consistency: emptyDimension("Consistency", "Study regularity", ["streakLength"]),
        accuracy: emptyDimension("Accuracy", "Session correctness", ["avgSessionScore"]),
        recovery: emptyDimension("Recovery", "Weak chapter follow-through", ["weakChapterRevisitRate"]),
        momentum: emptyDimension("Momentum", "Directional progress", ["recentScoreTrend"]),
        discipline: emptyDimension("Discipline", "Plan adherence", ["planFollowRate"]),
        confidenceStability: emptyDimension(
          "Confidence Stability",
          "Performance consistency",
          ["scoreVariance"],
        ),
      },
    },
    wellbeing: {
      burnoutRisk: "low",
      burnoutSignals: {
        sessionDurationDecline: false,
        avoidancePattern: false,
        accuracyPlateauDays: 0,
        streakBreaks: 0,
        negativeScoreSurges: 0,
      },
      emotionalTone: "neutral",
      recommendedTone: "optimization",
    },
    chapterMastery: {
      math: {},
      science: {},
      social: {},
    },
    sessionHistory: [],
    nextAction: {},
    recoveryPlans: [],
    subjectTargets: overrides?.subjectTargets ?? {},
    overrideHistory: [],
    deferredTasks: [],
    blueprint: loadSeedBlueprint(),
  };
}

export function applyOnboardingToProfile(
  profile: StudentLearningProfile,
  input: {
    name?: string;
    targetScore: number;
    weakSubjects?: string[];
    examDate?: string;
  },
): StudentLearningProfile {
  const allSubjects = ["math", "science", "social", "english", "kannada", "hindi"];
  const subjectTargets: Record<string, number> = {};
  for (const id of allSubjects) {
    subjectTargets[id] = input.weakSubjects?.includes(id)
      ? Math.max(60, input.targetScore - 10)
      : input.targetScore;
  }

  let daysToExam = 0;
  if (input.examDate) {
    const diff = new Date(input.examDate).getTime() - Date.now();
    daysToExam = Math.max(0, Math.ceil(diff / 86_400_000));
  }

  return {
    ...profile,
    student: {
      ...profile.student,
      name: input.name?.trim() || profile.student.name,
      targetScore: input.targetScore,
      daysToExam,
    },
    subjectTargets,
  };
}
