import type {
  ArchetypeOutput,
  AuraEngineOutputs,
  BehavioralSignals,
  BurnoutOutput,
  MomentumOutput,
  NextActionOutput,
  RankPredictionOutput,
  RecoveryEngineOutput,
  RevisionOutput,
  StudentLearningProfile,
} from "@/types/aura-engine-contracts";

import { computeAnalyticsFromSessions } from "@/engines/analytics";
import { burnoutDetectionEngine } from "@/engines/burnoutDetection";
import { momentumEngine } from "@/engines/momentum";
import { nextActionEngine } from "@/engines/nextAction";
import { rankPredictionEngine } from "@/engines/rankPrediction";
import { recoveryEngine } from "@/engines/recovery";
import { revisionOptimizerEngine } from "@/engines/revisionOptimizer";
import {
  loadSeedBlueprint,
  scoreProjectionEngine,
} from "@/engines/scoreProjection";
import { studentArchetypeEngine } from "@/engines/studentArchetype";
import { targetGapEngine } from "@/engines/targetGap";

const EMPTY_SIGNALS: BehavioralSignals = {
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
};

const EMPTY_ARCHETYPE: ArchetypeOutput = {
  archetype: "average",
  score: 0,
  signals: EMPTY_SIGNALS,
  dashboardTone: "You are capable of 85+.",
  messagingKey: "optimization",
  layoutDensity: "standard",
  showMetrics: ["subjectBalance", "weakAreas", "targetGap"],
  history: [],
};

const EMPTY_MOMENTUM: MomentumOutput = {
  streak: 0,
  trend: "stable",
  score: 0,
  recentAvgScore: 0,
  totalStudyMinutes: 0,
  badge: "🌱 Starting",
  weeklyPattern: [],
  computedAt: new Date().toISOString(),
};

const EMPTY_RECOVERY: RecoveryEngineOutput = {
  items: [],
  top3: [],
  totalAtRisk: 0,
  totalRecover: 0,
  computedAt: new Date().toISOString(),
};

const EMPTY_BURNOUT: BurnoutOutput = {
  risk: "low",
  score: 0,
  activeSignals: [],
  recommendation: "Start your first session today",
  recoveryAction: "Begin with any chapter",
};

const EMPTY_RANK: RankPredictionOutput = {
  predictedPercentile: 0,
  estimatedRank: "Not enough data" as RankPredictionOutput["estimatedRank"],
  stateAvgScore: 68,
  gapToTopTen: 0,
  gapToTopOne: 0,
  confidence: 0,
};

const EMPTY_REVISION: RevisionOutput = {
  schedule: [],
  totalDays: 0,
  dailyMinutes: 0,
};

const EMPTY_NEXT_ACTION: NextActionOutput = {
  recommendedAction: "Begin with any chapter",
  subject: "math",
  chapter: "overview",
  sessionType: "concept_review",
  estimatedGain: "+0 marks",
  timeRequired: 20,
  urgency: "medium",
  confidence: 0,
  rationale: "Start your first session today",
  followUp: null,
  computedAt: new Date().toISOString(),
};

export function runAllEngines(profile: StudentLearningProfile): AuraEngineOutputs {
  const blueprint = profile.blueprint ?? loadSeedBlueprint();
  const sessions = profile.sessionHistory ?? [];

  const projection = scoreProjectionEngine(profile.chapterMastery, blueprint);
  const target = targetGapEngine(
    profile.student.targetScore,
    projection,
    profile.chapterMastery,
    blueprint,
    sessions,
    profile.subjectTargets,
  );

  if (sessions.length === 0) {
    const archetype = EMPTY_ARCHETYPE;
    const momentum = EMPTY_MOMENTUM;
    const recovery = EMPTY_RECOVERY;
    const analytics = computeAnalyticsFromSessions(sessions);
    const nextAction = EMPTY_NEXT_ACTION;

    return {
      projection,
      archetype,
      recovery,
      target,
      momentum,
      nextAction,
      analytics,
      burnout: EMPTY_BURNOUT,
      rank: EMPTY_RANK,
      revision: EMPTY_REVISION,
    };
  }

  const archetype = studentArchetypeEngine(sessions, projection);
  const recovery = recoveryEngine(profile.chapterMastery, blueprint, sessions);
  const momentum = momentumEngine(sessions);
  const nextAction = nextActionEngine(recovery, target, momentum, archetype, sessions);
  const analytics = computeAnalyticsFromSessions(sessions);
  const burnout = burnoutDetectionEngine(analytics, sessions, momentum);
  const rank = rankPredictionEngine(projection);
  const revision = revisionOptimizerEngine(profile.chapterMastery, blueprint, sessions);

  return {
    projection,
    archetype,
    recovery,
    target,
    momentum,
    nextAction,
    analytics,
    burnout,
    rank,
    revision,
  };
}
