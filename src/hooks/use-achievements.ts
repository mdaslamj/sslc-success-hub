import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACHIEVEMENT_CATALOG,
  type AchievementDefinition,
  type AchievementInput,
} from "@/lib/achievements-catalog";
import {
  readStreak,
  readUserAchievements,
  unlockUserAchievementLocal,
  writeStreak,
} from "@/lib/analytics-store";
import { XP_REWARDS, levelFromXp, type LevelInfo } from "@/lib/xp";
import type { UserAchievementDoc } from "@/integrations/firebase/types";
import { useAnalytics } from "./use-analytics";
import { useQuizStats } from "./use-quiz-stats";

export type AchievementStatus = {
  def: AchievementDefinition;
  earned: boolean;
  progress: number;
  unlockedAt?: number;
  xpAwarded?: number;
};

export type AchievementsSnapshot = {
  userId: string;
  loading: boolean;
  xp: number;
  level: LevelInfo;
  earned: AchievementStatus[];
  locked: AchievementStatus[];
  all: AchievementStatus[];
  /** Achievements unlocked during this session — drives unlock animations. */
  recentUnlocks: UserAchievementDoc[];
  acknowledgeUnlock: (code: string) => void;
  streak: { current: number; longest: number };
};

/**
 * Gamification engine. Reads analytics, evaluates every catalog entry, and
 * persists newly-earned unlocks idempotently. Pure UI consumers can render
 * earned vs locked badges, XP, and unlock animations off this single snapshot.
 *
 * Future hook points:
 *  - swap `unlockUserAchievementLocal` for the Firestore `unlockUserAchievement`
 *    once Firebase Auth is wired (signature is compatible).
 *  - feed `streak` into a class leaderboard query.
 *  - feed `bySubject` progress into AI motivation / rank prediction.
 */
export function useAchievements(): AchievementsSnapshot {
  const a = useAnalytics();
  const quizStats = useQuizStats();
  const [unlocked, setUnlocked] = useState<UserAchievementDoc[]>([]);
  const [recentUnlocks, setRecentUnlocks] = useState<UserAchievementDoc[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const [streakSnapshot, setStreakSnapshot] = useState<{ current: number; longest: number }>({
    current: 0,
    longest: 0,
  });

  // Bootstrap unlocked list once we know the user.
  useEffect(() => {
    if (!a.userId) return;
    const existing = readUserAchievements(a.userId);
    seenRef.current = new Set(existing.map((u) => u.code));
    setUnlocked(existing);
    const stored = readStreak(a.userId);
    setStreakSnapshot({
      current: stored?.current ?? a.streak.current,
      longest: Math.max(stored?.longest ?? 0, a.streak.longest),
    });
  }, [a.userId, a.streak.current, a.streak.longest]);

  // Persist streak ledger whenever analytics streak advances.
  useEffect(() => {
    if (!a.userId) return;
    const stored = readStreak(a.userId);
    const next = {
      userId: a.userId,
      current: a.streak.current,
      longest: Math.max(a.streak.longest, stored?.longest ?? 0),
      lastDayKey:
        a.weekly.find((d) => d.minutes > 0)?.dayKey ?? stored?.lastDayKey ?? null,
      updatedAt: Date.now(),
      id: a.userId,
    };
    writeStreak(next);
    setStreakSnapshot({ current: next.current, longest: next.longest });
  }, [a.userId, a.streak.current, a.streak.longest, a.weekly]);

  // Evaluate catalog on every analytics tick and unlock new entries.
  useEffect(() => {
    if (!a.userId || a.loading) return;
    const input: AchievementInput = {
      streak: { current: a.streak.current, longest: a.streak.longest },
      completedChapters: a.completedChapters,
      focusSessions: a.focusSessions,
      totalStudyHours: a.totalStudyHours,
      totalStudyMinutes: a.totalStudyMinutes,
      bySubject: a.bySubject.map((s) => ({
        id: s.id,
        name: s.name,
        completion: s.completion,
        minutes: s.minutes,
      })),
      weekly: a.weekly.map((w) => ({ dayKey: w.dayKey, minutes: w.minutes })),
      quizzes: {
        attempts: quizStats.attempts,
        bestAccuracy: quizStats.bestAccuracy,
        perfectScores: quizStats.perfectScores,
        averageScore: quizStats.averageScore,
      },
    };
    const fresh: UserAchievementDoc[] = [];
    for (const def of ACHIEVEMENT_CATALOG) {
      if (seenRef.current.has(def.code)) continue;
      const r = def.evaluate(input);
      if (r.earned) {
        const doc = unlockUserAchievementLocal({
          userId: a.userId,
          code: def.code,
          xpAwarded: def.xp,
          snapshot: r.snapshot,
        });
        seenRef.current.add(def.code);
        fresh.push(doc);
      }
    }
    if (fresh.length) {
      setUnlocked((prev) => prev.concat(fresh));
      setRecentUnlocks((prev) => prev.concat(fresh));
    }
  }, [
    a.userId,
    a.loading,
    a.streak.current,
    a.streak.longest,
    a.completedChapters,
    a.focusSessions,
    a.totalStudyHours,
    a.totalStudyMinutes,
    a.bySubject,
    a.weekly,
    quizStats.attempts,
    quizStats.bestAccuracy,
    quizStats.perfectScores,
    quizStats.averageScore,
  ]);

  const statuses = useMemo<AchievementStatus[]>(() => {
    const unlockedByCode = new Map(unlocked.map((u) => [u.code, u]));
    const input: AchievementInput = {
      streak: { current: a.streak.current, longest: a.streak.longest },
      completedChapters: a.completedChapters,
      focusSessions: a.focusSessions,
      totalStudyHours: a.totalStudyHours,
      totalStudyMinutes: a.totalStudyMinutes,
      bySubject: a.bySubject.map((s) => ({
        id: s.id,
        name: s.name,
        completion: s.completion,
        minutes: s.minutes,
      })),
      weekly: a.weekly.map((w) => ({ dayKey: w.dayKey, minutes: w.minutes })),
      quizzes: {
        attempts: quizStats.attempts,
        bestAccuracy: quizStats.bestAccuracy,
        perfectScores: quizStats.perfectScores,
        averageScore: quizStats.averageScore,
      },
    };
    return ACHIEVEMENT_CATALOG.map((def) => {
      const u = unlockedByCode.get(def.code);
      const r = def.evaluate(input);
      return {
        def,
        earned: Boolean(u) || r.earned,
        progress: u ? 1 : r.progress,
        unlockedAt: u?.unlockedAt,
        xpAwarded: u?.xpAwarded,
      };
    });
  }, [unlocked, a, quizStats]);

  // XP = unlock rewards + engagement multipliers.
  const xp = useMemo(() => {
    const unlockXp = unlocked.reduce((sum, u) => sum + (u.xpAwarded ?? 0), 0);
    const engagementXp =
      a.focusSessions * XP_REWARDS.focusSession +
      a.completedChapters * XP_REWARDS.chapterCompleted +
      Math.floor(a.totalStudyHours) * XP_REWARDS.studyHour +
      a.streak.current * XP_REWARDS.streakDay;
    // Quiz XP — already computed per-attempt by the engine.
    const quizXp = quizStats.attemptsList.reduce(
      (sum, q) => sum + (q.xpAwarded ?? 0),
      0,
    );
    return unlockXp + engagementXp + quizXp;
  }, [
    unlocked,
    a.focusSessions,
    a.completedChapters,
    a.totalStudyHours,
    a.streak.current,
    quizStats.attemptsList,
  ]);

  return {
    userId: a.userId,
    loading: a.loading,
    xp,
    level: levelFromXp(xp),
    earned: statuses.filter((s) => s.earned),
    locked: statuses.filter((s) => !s.earned),
    all: statuses,
    recentUnlocks,
    acknowledgeUnlock: (code) =>
      setRecentUnlocks((prev) => prev.filter((u) => u.code !== code)),
    streak: streakSnapshot,
  };
}