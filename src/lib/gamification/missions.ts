/**
 * Daily mission generator. Builds 3 adaptive missions per day, seeded by
 * dayKey so missions are stable for the day but evolve with student data.
 */
import type { MissionDoc, MissionKind } from "@/integrations/firebase/types";

export type MissionContext = {
  userId: string;
  dayKey: string;
  /** Daily study goal in minutes (from profile). */
  dailyGoalMinutes: number;
  /** Weak subjects sorted by mastery asc. */
  weakSubjects: { id: string; name: string; mastery: number }[];
  /** Days until exam — drives intensity. */
  daysToExam: number;
  /** Recent revision queue length. */
  revisionDue: number;
  /** Whether the student has done a mock exam this week. */
  mockExamThisWeek: boolean;
};

type Seed = MissionContext & { idx: number; kind: MissionKind };

const MISSION_TEMPLATES: Array<(c: MissionContext) => Omit<MissionDoc, "id" | "userId" | "dayKey" | "progress" | "completed" | "createdAt"> | null> = [
  (c) => ({
    kind: "study_minutes",
    title: `Study ${c.dailyGoalMinutes} focused minutes`,
    description: "Pomodoro counts — small blocks add up.",
    icon: "⏱️",
    target: c.dailyGoalMinutes,
    xpReward: 60,
  }),
  (c) => (c.revisionDue > 0
    ? {
        kind: "revision_count",
        title: `Clear ${Math.min(3, c.revisionDue)} revision items`,
        description: "Spaced recall keeps memory fresh.",
        icon: "🔁",
        target: Math.min(3, c.revisionDue),
        xpReward: 45,
      }
    : null),
  (c) => (c.weakSubjects[0]
    ? {
        kind: "weak_recovery",
        title: `Practice ${c.weakSubjects[0].name}`,
        description: "Your weakest area today — one win here goes far.",
        icon: "💪",
        target: 1,
        xpReward: 75,
      }
    : null),
  (c) => (c.daysToExam <= 60 && !c.mockExamThisWeek
    ? {
        kind: "mock_exam",
        title: "Attempt a mini mock",
        description: "Build exam stamina under realistic pressure.",
        icon: "📝",
        target: 1,
        xpReward: 90,
      }
    : null),
  () => ({
    kind: "scan_solve",
    title: "Solve one question with Aura scan",
    description: "Camera in, clarity out.",
    icon: "📷",
    target: 1,
    xpReward: 35,
  }),
  () => ({
    kind: "reflection",
    title: "Log a 30-second reflection",
    description: "Mood + confidence — Aura learns from this.",
    icon: "✨",
    target: 1,
    xpReward: 25,
  }),
];

/** Build today's mission set (up to 3, prioritising weak-recovery + revision). */
export function generateMissions(ctx: MissionContext): MissionDoc[] {
  const out: MissionDoc[] = [];
  const now = Date.now();
  for (const tmpl of MISSION_TEMPLATES) {
    if (out.length >= 3) break;
    const m = tmpl(ctx);
    if (!m) continue;
    out.push({
      ...m,
      id: `${ctx.dayKey}_${m.kind}`,
      userId: ctx.userId,
      dayKey: ctx.dayKey,
      progress: 0,
      completed: false,
      createdAt: now,
    });
  }
  return out;
}

/** Update progress on a mission of a given kind. Returns updated doc + whether newly completed. */
export function advanceMission(
  m: MissionDoc,
  amount: number,
): { doc: MissionDoc; newlyCompleted: boolean } {
  if (m.completed) return { doc: m, newlyCompleted: false };
  const progress = Math.min(m.target, m.progress + amount);
  const completed = progress >= m.target;
  return {
    doc: {
      ...m,
      progress,
      completed,
      completedAt: completed ? Date.now() : m.completedAt,
    },
    newlyCompleted: completed,
  };
}

export function missionPercent(m: MissionDoc): number {
  return m.target > 0 ? Math.round((m.progress / m.target) * 100) : 0;
}

// Re-export Seed for potential test usage
export type { Seed };