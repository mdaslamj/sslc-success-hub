/**
 * AURA ENGINE CONTRACTS
 * Karnataka SSLC Intelligence Layer v2
 *
 * These TypeScript interfaces define the contracts for all 6 engines.
 * Cursor builds these. Lovable consumes their outputs.
 * Engines NEVER communicate via UI state — only via the StudentLearningProfile.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

export type Subject      = "math" | "science" | "social";
export type UrgencyLevel = "critical" | "high" | "medium" | "low";
export type Trend        = "improving" | "declining" | "stable";
export type Archetype    = "struggling" | "average" | "topper";
export type SessionType  = "adaptive" | "recovery" | "timed_test" | "pyq_practice" | "concept_review" | "formula_drill";

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT LEARNING PROFILE (source of truth)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChapterMasteryEntry {
  mastery:       number;        // 0–100
  trend:         Trend;
  lastPracticed: string;        // ISO date
  attemptCount:  number;
}

export interface SessionRecord {
  id:                  string;
  date:                string;   // ISO date
  subject:             Subject | null;
  chapter:             string | null;
  durationMinutes:     number;
  questionsAttempted:  number;
  questionsCorrect:    number;
  score:               number | null; // 0–100
  hintsUsed:           number;
  retriesOnWrong:      number;
  completedPlan:       boolean;
  panicSignal:         boolean;   // score dropped >15% vs practice avg under time pressure
  engineType:          SessionType | null;
  skipReason?:         string;
}

export interface BlueprintEntry {
  marks: number;
  name:  string;
}

export interface StudentLearningProfile {
  _meta: {
    schema:      string;
    version:     string;
    board:       string;
    year:        string;
    generatedAt: string;
  };
  student: {
    id:          string;
    name:        string;
    grade:       string;
    school:      string;
    enrolledOn:  string;
    targetScore: number;   // percent
    daysToExam:  number;
  };
  archetype:       ArchetypeState;
  analytics:       AnalyticsState;
  wellbeing:       WellbeingState;
  chapterMastery:  Record<Subject, Record<string, ChapterMasteryEntry>>;
  sessionHistory:  SessionRecord[];
  nextAction:      NextActionOutput;
  recoveryPlans:   RecoveryPlan[];
  targetConfig?:   TargetConfiguration;
  adaptiveMsg?:    AdaptiveMessaging;
  blueprint:       Record<Subject, Record<string, BlueprintEntry>>;
}


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE 1 — ScoreProjectionEngine
// Foundation. Every other engine reads from its output.
// Formula: Σ mastery[ch] × blueprintMarks[ch] / 100  (per subject, then total)
// ─────────────────────────────────────────────────────────────────────────────

export interface SubjectProjection {
  predicted:  number;   // marks predicted (e.g. 58.4)
  max:        number;   // total marks available
  percentage: number;   // 0–100
}

export interface ScoreProjectionOutput {
  bySubject:   Record<Subject, SubjectProjection>;
  total:       number;   // sum of all predicted marks
  totalMax:    number;   // sum of all blueprint marks
  percentage:  number;   // overall predicted %
  grade:       string;   // "A+" | "A" | "B" | "C" | "Needs Work"
  computedAt:  string;
}

export function scoreProjectionEngine(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint:      StudentLearningProfile["blueprint"]
): ScoreProjectionOutput { /* implemented in engines/scoreProjection.ts */ throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE 2 — StudentArchetypeEngine
// CRITICAL: No self-report. Infer from behavioral signals only.
// Input signals: mastery + session behavior + performance patterns
// ─────────────────────────────────────────────────────────────────────────────

export interface BehavioralSignals {
  overallMastery:            number;   // from ScoreProjectionEngine output
  sessionCompletionRate:     number;   // % of sessions where completedPlan = true
  accuracyTrend:             Trend;    // recent 5 sessions vs previous 5
  recoverySpeed:             "fast" | "moderate" | "slow";
  streakDiscipline:          number;   // 0–100 based on streak consistency
  panicIndex:                number;   // 0–100, % of sessions with panicSignal = true
  helpSeekingFrequency:      number;   // avg hintsUsed per session
  retryBehavior:             number;   // avg retriesOnWrong per session
  examPerformanceVsPractice: number;   // practice avg minus exam avg (negative = underperforms)
  timeOnHardProblems:        number;   // 0–100 engagement score on hard questions
}

export interface ArchetypeState {
  current:             Archetype;
  inferredAt:          string;
  inferenceMethod:     "behavioral";  // never "self_report"
  behavioralSignals:   BehavioralSignals;
  archetypeScore:      number;        // 0–100 composite
  archetypeBand:       Archetype;
  archetypeHistory:    Array<{ date: string; band: Archetype; score: number }>;
}

export interface ArchetypeOutput {
  archetype:     Archetype;
  score:         number;
  signals:       BehavioralSignals;
  dashboardTone: string;
  messagingKey:  "recovery" | "optimization" | "precision";
  layoutDensity: "simple" | "standard" | "advanced";
  showMetrics:   string[];
  history:       ArchetypeState["archetypeHistory"];
}

export function studentArchetypeEngine(
  sessions:    SessionRecord[],
  projection:  ScoreProjectionOutput
): ArchetypeOutput { throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE 3 — RecoveryEngine
// Diagnoses mark loss and builds actionable chapter recovery roadmaps.
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryItem {
  chapter:        string;
  subject:        Subject;
  name:           string;
  currentMastery: number;
  blueprintMarks: number;
  marksAtRisk:    number;      // marks being lost due to low mastery
  recoverableMarks: number;    // realistically recoverable in N sessions
  sessionsNeeded: number;
  urgency:        UrgencyLevel;
  status:         "pending" | "active" | "completed";
  fromPct:        number;
  toPct:          number;      // projected mastery after recovery
  recoveryProbability: number; // 0–1, how likely recovery is given student behavior
  actionPlan:     Array<{
    session:  number;
    type:     SessionType;
    duration: number;
    focus:    string;
  }>;
}

export interface RecoveryPlan extends RecoveryItem {
  startedAt:               string | null;
  estimatedCompletionDate: string | null;
  progressPercent:         number;
}

export interface RecoveryEngineOutput {
  items:         RecoveryItem[];
  totalAtRisk:   number;       // total marks at risk across all weak chapters
  totalRecover:  number;       // total marks potentially recoverable
  top3:          RecoveryItem[];
  computedAt:    string;
}

export function recoveryEngine(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint:      StudentLearningProfile["blueprint"],
  sessions:       SessionRecord[]
): RecoveryEngineOutput { throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE 4 — TargetGapEngine
// Finds highest ROI path from current score to target.
// ROI = marksGain / estimatedHours
// ─────────────────────────────────────────────────────────────────────────────

export interface ROIChapter {
  chapter:       string;
  subject:       Subject;
  name:          string;
  currentMastery: number;
  blueprintMarks: number;
  gainPossible:  number;     // marks gain if mastery improves maximally
  hoursEstimate: number;
  roi:           number;     // gainPossible / hoursEstimate
}

export interface TargetConfiguration {
  targetScore:    number;
  currentPrediction: number;
  gapToClose:     number;
  gapUnit:        "percent" | "marks";
  roiPath:        ROIChapter[];
  fastestPathHours: number;
  fastestPathGain:  number;
  lastComputedAt:   string;
}

export interface TargetGapOutput {
  targetScore:     number;
  currentScore:    number;
  gap:             number;
  gapPercentage:   number;
  rankedChapters:  ROIChapter[];       // sorted by roi desc
  fastestPath:     ROIChapter[];       // minimum chapters to close the gap
  estimatedHours:  number;
  targetReachable: boolean;
  reachableBy:     string | null;      // ISO date estimate
  computedAt:      string;
}

export function targetGapEngine(
  targetScore:    number,
  projection:     ScoreProjectionOutput,
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint:      StudentLearningProfile["blueprint"]
): TargetGapOutput { throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE 5 — MomentumEngine
// Tracks study energy, streaks, and directional progress.
// ─────────────────────────────────────────────────────────────────────────────

export interface MomentumOutput {
  streak:           number;
  trend:            Trend;
  score:            number;      // 0–100 composite momentum score
  recentAvgScore:   number;
  totalStudyMinutes: number;
  badge:            string;      // "🔥 On Fire" | "⚡ Momentum" | "✨ Building" | "🌱 Starting"
  weeklyPattern:    Array<{ date: string; studyMinutes: number; avgScore: number }>;
  computedAt:       string;
}

export function momentumEngine(
  sessions: SessionRecord[]
): MomentumOutput { throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE 6 — NextActionEngine  ← NEW. Aura's signature experience.
// Unifies Recovery + Target + Momentum into ONE recommended action.
// This is what creates the "always knows what to do next" feeling.
// ─────────────────────────────────────────────────────────────────────────────

export interface NextActionOutput {
  recommendedAction:  string;     // human-readable: "Practice Electricity Numericals"
  subject:            Subject;
  chapter:            string;
  sessionType:        SessionType;
  estimatedGain:      string;     // "+4.2 marks"
  timeRequired:       number;     // minutes
  urgency:            UrgencyLevel;
  confidence:         number;     // 0–1, how certain Aura is this is the best move
  rationale:          string;     // explanation (for debugging / transparency mode)
  followUp:           Omit<NextActionOutput, "followUp"> | null;
  computedAt:         string;
}

/**
 * Decision logic:
 * 1. If critical recovery chapter exists (mastery < 50, blueprintMarks >= 6) → recommend recovery
 * 2. Else if today is skip day (streak at risk) → recommend easiest high-ROI chapter
 * 3. Else if target gap > 10% → recommend highest ROI chapter from targetGapEngine
 * 4. Else (topper mode) → recommend precision drill on almost-mastered chapter
 */
export function nextActionEngine(
  recovery:   RecoveryEngineOutput,
  target:     TargetGapOutput,
  momentum:   MomentumOutput,
  archetype:  ArchetypeOutput,
  sessions:   SessionRecord[]
): NextActionOutput { throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS SCORING SYSTEM (Phase A4)
// Scores 6 dimensions from raw session history
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsDimension {
  score:       number;   // 0–100
  label:       string;
  description: string;
  trend:       Trend;
  signals:     string[];
}

export interface AnalyticsState {
  overallHealthScore: number;
  lastUpdated:        string;
  dimensions: {
    consistency:         AnalyticsDimension;
    accuracy:            AnalyticsDimension;
    recovery:            AnalyticsDimension;
    momentum:            AnalyticsDimension;
    discipline:          AnalyticsDimension;
    confidenceStability: AnalyticsDimension;
    // ^ Critical: two students at 85% can differ here.
    // Low = panic-driven. Used for burnout prediction.
  };
}

export function computeAnalytics(
  sessions:  SessionRecord[],
  archetype: ArchetypeOutput
): AnalyticsState { throw 0; }


// ─────────────────────────────────────────────────────────────────────────────
// WELLBEING STATE
// ─────────────────────────────────────────────────────────────────────────────

export interface WellbeingState {
  burnoutRisk:    "low" | "medium" | "high";
  burnoutSignals: {
    sessionDurationDecline: boolean;
    avoidancePattern:       boolean;
    accuracyPlateauDays:    number;
    streakBreaks:           number;
    negativeScoreSurges:    number;
  };
  emotionalTone:      string;
  recommendedTone:    "recovery" | "optimization" | "challenge";
}


// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE MESSAGING LAYER
// NOT motivational quotes. Context-aware micro-guidance.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdaptiveMessaging {
  archetype:       Archetype;
  tone:            "recovery" | "optimization" | "challenge" | "reassurance";
  primaryMessage:  string;
  contextMessages: {
    onLogin:          string;
    onStreak:         string;
    onRecovery:       string;
    onTargetGap:      string;
    onMissedDay:      string;
    onImprovement:    string;
    onPanicDetected:  string;
    onTopper:         string;
    onStruggling:     string;
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// ENGINE EXECUTION ORDER (enforced at runtime)
// Never run out of order. Each engine depends on previous outputs.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EXECUTION PIPELINE:
 *
 * profile (StudentLearningProfile)
 *   │
 *   ├─► [1] scoreProjectionEngine(mastery, blueprint)
 *   │         └─► ScoreProjectionOutput
 *   │
 *   ├─► [2] studentArchetypeEngine(sessions, projection)
 *   │         └─► ArchetypeOutput
 *   │
 *   ├─► [3] recoveryEngine(mastery, blueprint, sessions)
 *   │         └─► RecoveryEngineOutput
 *   │
 *   ├─► [4] targetGapEngine(targetScore, projection, mastery, blueprint)
 *   │         └─► TargetGapOutput
 *   │
 *   ├─► [5] momentumEngine(sessions)
 *   │         └─► MomentumOutput
 *   │
 *   └─► [6] nextActionEngine(recovery, target, momentum, archetype, sessions)
 *             └─► NextActionOutput  ← Aura's signature experience
 */

export interface AuraEngineOutputs {
  projection: ScoreProjectionOutput;
  archetype:  ArchetypeOutput;
  recovery:   RecoveryEngineOutput;
  target:     TargetGapOutput;
  momentum:   MomentumOutput;
  nextAction: NextActionOutput;
  analytics:  AnalyticsState;
}

export function runAllEngines(
  profile: StudentLearningProfile
): AuraEngineOutputs { throw 0; }
