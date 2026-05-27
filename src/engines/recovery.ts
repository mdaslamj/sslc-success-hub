import type {
  BlueprintEntry,
  RecoveryEngineOutput,
  RecoveryItem,
  SessionRecord,
  SessionType,
  StudentLearningProfile,
  Subject,
  UrgencyLevel,
} from "@/types/aura-engine-contracts";

import seedProfile from "@/data/StudentLearningProfile.json";
import { loadSeedBlueprint } from "@/engines/scoreProjection";

export type RecoveryResult = RecoveryEngineOutput;

const SUBJECTS: Subject[] = ["math", "science", "social"];
const RECOVERY_THRESHOLD = 72;
const ACTION_PLAN_TYPES: SessionType[] = ["concept_review", "pyq_practice", "timed_test"];

type RecoverySpeed = "fast" | "moderate" | "slow";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chapterKey(subject: Subject, chapter: string): string {
  return `${subject}:${chapter}`;
}

function derivePanicIndex(sessions: SessionRecord[]): number {
  const practice = sessions.filter((session) => session.questionsAttempted > 0);
  if (practice.length === 0) return 0;
  return round1(
    (practice.filter((session) => session.panicSignal).length / practice.length) * 100,
  );
}

function deriveRecoverySpeed(sessions: SessionRecord[]): RecoverySpeed {
  const practice = sessions.filter(
    (session) => session.questionsAttempted > 0 && session.subject && session.chapter,
  );

  const byChapter = new Map<string, SessionRecord[]>();
  practice.forEach((session) => {
    const key = chapterKey(session.subject!, session.chapter!);
    const list = byChapter.get(key) ?? [];
    list.push(session);
    byChapter.set(key, list);
  });

  let revisits = 0;
  let improvements = 0;

  byChapter.forEach((records) => {
    if (records.length < 2) return;
    revisits += 1;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0]?.score ?? 0;
    const last = sorted[sorted.length - 1]?.score ?? 0;
    if (last > first + 3) improvements += 1;
  });

  if (revisits === 0) return "moderate";

  const rate = improvements / revisits;
  if (rate >= 0.66) return "fast";
  if (rate >= 0.33) return "moderate";
  return "slow";
}

function recoveryProbability(panicIndex: number, recoverySpeed: RecoverySpeed): number {
  const speedBonus: Record<RecoverySpeed, number> = {
    fast: 0.12,
    moderate: 0,
    slow: -0.12,
  };

  return round2(
    clamp(0.82 - (panicIndex / 100) * 0.45 + speedBonus[recoverySpeed], 0.25, 0.95),
  );
}

function urgencyForMastery(mastery: number): UrgencyLevel {
  if (mastery < 50) return "critical";
  if (mastery < 62) return "high";
  return "medium";
}

function buildActionPlan(
  chapterName: string,
  sessionsNeeded: number,
): RecoveryItem["actionPlan"] {
  const baseDuration = clamp(Math.round(sessionsNeeded * 12 + 20), 25, 45);

  return ACTION_PLAN_TYPES.map((type, index) => ({
    session: index + 1,
    type,
    duration: baseDuration + index * 5,
    focus:
      type === "concept_review"
        ? `Core concepts — ${chapterName}`
        : type === "pyq_practice"
          ? `PYQ drill — ${chapterName}`
          : `Timed checkpoint — ${chapterName}`,
  }));
}

function resolveStatus(
  subject: Subject,
  chapter: string,
  mastery: number,
  sessions: SessionRecord[],
): RecoveryItem["status"] {
  if (mastery >= RECOVERY_THRESHOLD) return "completed";

  const chapterSessions = sessions.filter(
    (session) => session.subject === subject && session.chapter === chapter,
  );
  const latest = chapterSessions[chapterSessions.length - 1];

  if (
    latest &&
    (latest.engineType === "recovery" || latest.engineType === "concept_review")
  ) {
    return "active";
  }

  return "pending";
}

function iterateBlueprintChapters(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
) {
  const rows: Array<{
    subject: Subject;
    chapter: string;
    name: string;
    marks: number;
    mastery: number;
  }> = [];

  SUBJECTS.forEach((subject) => {
    const subjectBlueprint = blueprint[subject] ?? {};
    Object.entries(subjectBlueprint).forEach(([chapter, entry]) => {
      if (chapter.startsWith("_")) return;
      rows.push({
        subject,
        chapter,
        name: entry.name,
        marks: entry.marks,
        mastery: chapterMastery[subject]?.[chapter]?.mastery ?? 0,
      });
    });
  });

  return rows;
}

function buildRecoveryItem(
  row: {
    subject: Subject;
    chapter: string;
    name: string;
    marks: number;
    mastery: number;
  },
  sessions: SessionRecord[],
  panicIndex: number,
  recoverySpeed: RecoverySpeed,
): RecoveryItem {
  const marksAtRisk = round2(row.marks * (1 - row.mastery / 100));
  const recoverableMarks = round2(
    Math.min(marksAtRisk * 0.78, row.marks * 0.5),
  );
  const sessionsNeeded = Math.ceil(recoverableMarks / 2.2);
  const fromPct = row.mastery;
  const toPct = Math.min(92, row.mastery + 18);

  return {
    chapter: row.chapter,
    subject: row.subject,
    name: row.name,
    currentMastery: row.mastery,
    blueprintMarks: row.marks,
    marksAtRisk,
    recoverableMarks,
    sessionsNeeded,
    urgency: urgencyForMastery(row.mastery),
    status: resolveStatus(row.subject, row.chapter, row.mastery, sessions),
    fromPct,
    toPct,
    recoveryProbability: recoveryProbability(panicIndex, recoverySpeed),
    actionPlan: buildActionPlan(row.name, sessionsNeeded),
  };
}

export function recoveryEngine(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
  sessions: SessionRecord[],
): RecoveryResult {
  const panicIndex = derivePanicIndex(sessions);
  const recoverySpeed = deriveRecoverySpeed(sessions);

  const items = iterateBlueprintChapters(chapterMastery, blueprint)
    .filter((row) => row.mastery < RECOVERY_THRESHOLD)
    .map((row) => buildRecoveryItem(row, sessions, panicIndex, recoverySpeed))
    .sort((a, b) => b.marksAtRisk - a.marksAtRisk);

  const totalAtRisk = round2(items.reduce((sum, item) => sum + item.marksAtRisk, 0));
  const totalRecover = round2(
    items.reduce((sum, item) => sum + item.recoverableMarks, 0),
  );

  return {
    items,
    totalAtRisk,
    totalRecover,
    top3: items.slice(0, 3),
    computedAt: new Date().toISOString(),
  };
}

export function loadSeedSessions(): SessionRecord[] {
  return (seedProfile as { sessionHistory: SessionRecord[] }).sessionHistory;
}

export function runRecoveryFromSeed(): RecoveryResult {
  const profile = seedProfile as StudentLearningProfile;
  const blueprint = loadSeedBlueprint();
  return recoveryEngine(profile.chapterMastery, blueprint, profile.sessionHistory);
}
