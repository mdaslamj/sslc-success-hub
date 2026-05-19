/**
 * Achievement catalog + evaluators.
 *
 * Each entry is a pure declarative definition. The `evaluate` function takes
 * an `AnalyticsSnapshot`-shaped input and returns the current progress (0..1)
 * plus whether the achievement is currently earned. The achievements engine
 * (use-achievements) calls these on every analytics tick and unlocks any
 * newly-earned codes idempotently.
 *
 * Adding a new achievement = append one entry. No other code changes needed.
 * Designed so future categories (subject mastery per-subject, class rank,
 * AI-curated weekly goals) can be appended without touching the engine.
 */

export type AchievementCategory =
  | "streak"
  | "chapters"
  | "focus"
  | "hours"
  | "mastery"
  | "consistency"
  | "quiz";

export type AchievementInput = {
  streak: { current: number; longest: number };
  completedChapters: number;
  focusSessions: number;
  totalStudyHours: number;
  totalStudyMinutes: number;
  bySubject: { id: string; name: string; completion: number; minutes: number }[];
  weekly: { dayKey: string; minutes: number }[];
  /** Optional quiz roll-up — absent for legacy callers, treated as zeros. */
  quizzes?: {
    attempts: number;
    bestAccuracy: number; // 0..100
    perfectScores: number;
    averageScore: number; // 0..100
  };
};

export type AchievementDefinition = {
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // emoji — kept as string so it serialises cleanly to Firestore
  xp: number;
  /** Returns { progress: 0..1, earned: boolean, snapshot } for the current input. */
  evaluate: (input: AchievementInput) => {
    progress: number;
    earned: boolean;
    snapshot?: Record<string, number | string>;
  };
};

const ratio = (n: number, d: number) => (d <= 0 ? 0 : Math.min(1, n / d));

function streakDef(days: number, xp: number): AchievementDefinition {
  return {
    code: `streak_${days}`,
    title: `${days}-Day Streak`,
    description: `Study at least once every day for ${days} days in a row.`,
    category: "streak",
    icon: days >= 30 ? "🔥" : days >= 7 ? "⚡" : "✨",
    xp,
    evaluate: (i) => ({
      progress: ratio(i.streak.current, days),
      earned: i.streak.longest >= days,
      snapshot: { streak: i.streak.current },
    }),
  };
}

function chaptersDef(n: number, xp: number, title: string): AchievementDefinition {
  return {
    code: `chapters_${n}`,
    title,
    description: `Complete ${n} chapter${n === 1 ? "" : "s"} across any subject.`,
    category: "chapters",
    icon: n >= 25 ? "📚" : n >= 10 ? "📖" : "🌱",
    xp,
    evaluate: (i) => ({
      progress: ratio(i.completedChapters, n),
      earned: i.completedChapters >= n,
      snapshot: { chapters: i.completedChapters },
    }),
  };
}

function focusDef(n: number, xp: number): AchievementDefinition {
  return {
    code: `focus_${n}`,
    title: `${n} Focus Sessions`,
    description: `Complete ${n} Pomodoro focus session${n === 1 ? "" : "s"}.`,
    category: "focus",
    icon: n >= 50 ? "🧠" : n >= 10 ? "⏱️" : "🎯",
    xp,
    evaluate: (i) => ({
      progress: ratio(i.focusSessions, n),
      earned: i.focusSessions >= n,
      snapshot: { sessions: i.focusSessions },
    }),
  };
}

function hoursDef(h: number, xp: number): AchievementDefinition {
  return {
    code: `hours_${h}`,
    title: `${h} Hours Studied`,
    description: `Log a total of ${h} hours of study time.`,
    category: "hours",
    icon: h >= 50 ? "🏆" : h >= 10 ? "⌛" : "⏳",
    xp,
    evaluate: (i) => ({
      progress: ratio(i.totalStudyHours, h),
      earned: i.totalStudyHours >= h,
      snapshot: { hours: i.totalStudyHours },
    }),
  };
}

/** Subject mastery — earned once any subject crosses the completion threshold. */
function masteryDef(pct: number, xp: number, title: string): AchievementDefinition {
  return {
    code: `mastery_${pct}`,
    title,
    description: `Reach ${pct}% completion in any single subject.`,
    category: "mastery",
    icon: pct >= 100 ? "👑" : pct >= 75 ? "💎" : "⭐",
    xp,
    evaluate: (i) => {
      const best = i.bySubject.reduce((m, s) => Math.max(m, s.completion), 0);
      return {
        progress: ratio(best, pct),
        earned: best >= pct,
        snapshot: { bestCompletion: best },
      };
    },
  };
}

/** Consistency — N distinct study days in the last 7. */
function consistencyDef(days: number, xp: number): AchievementDefinition {
  return {
    code: `consistency_${days}of7`,
    title: `${days}-of-7 Consistency`,
    description: `Study on ${days} different days this week.`,
    category: "consistency",
    icon: days >= 7 ? "🌟" : "📅",
    xp,
    evaluate: (i) => {
      const active = i.weekly.filter((d) => d.minutes > 0).length;
      return {
        progress: ratio(active, days),
        earned: active >= days,
        snapshot: { activeDays: active },
      };
    },
  };
}

function quizCountDef(n: number, xp: number, title: string): AchievementDefinition {
  return {
    code: `quiz_count_${n}`,
    title,
    description: `Complete ${n} quiz${n === 1 ? "" : "zes"}.`,
    category: "quiz",
    icon: n >= 25 ? "🏅" : n >= 10 ? "📝" : "🧩",
    xp,
    evaluate: (i) => {
      const attempts = i.quizzes?.attempts ?? 0;
      return {
        progress: ratio(attempts, n),
        earned: attempts >= n,
        snapshot: { attempts },
      };
    },
  };
}

function quizAccuracyDef(pct: number, xp: number, title: string): AchievementDefinition {
  return {
    code: `quiz_accuracy_${pct}`,
    title,
    description: `Score at least ${pct}% accuracy on a quiz.`,
    category: "quiz",
    icon: pct >= 100 ? "💯" : "🎯",
    xp,
    evaluate: (i) => {
      const best = i.quizzes?.bestAccuracy ?? 0;
      return {
        progress: ratio(best, pct),
        earned: best >= pct,
        snapshot: { bestAccuracy: best },
      };
    },
  };
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  // Streaks
  streakDef(3, 60),
  streakDef(7, 150),
  streakDef(14, 300),
  streakDef(30, 600),
  // Chapters
  chaptersDef(1, 50, "First Steps"),
  chaptersDef(5, 120, "Five Down"),
  chaptersDef(10, 250, "Double Digits"),
  chaptersDef(25, 500, "Quarter Century"),
  // Focus sessions
  focusDef(1, 40),
  focusDef(10, 150),
  focusDef(25, 300),
  focusDef(50, 600),
  // Hours
  hoursDef(1, 50),
  hoursDef(10, 200),
  hoursDef(50, 750),
  // Subject mastery
  masteryDef(50, 200, "Halfway Hero"),
  masteryDef(75, 400, "Subject Specialist"),
  masteryDef(100, 800, "Subject Master"),
  // Consistency
  consistencyDef(3, 100),
  consistencyDef(5, 200),
  consistencyDef(7, 400),
  // Quizzes
  quizCountDef(1, 50, "Quiz Rookie"),
  quizCountDef(10, 200, "Quiz Regular"),
  quizCountDef(25, 500, "Quiz Veteran"),
  quizAccuracyDef(80, 150, "Sharp Shooter"),
  quizAccuracyDef(100, 400, "Perfect Score"),
];

export function findAchievement(code: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_CATALOG.find((a) => a.code === code);
}