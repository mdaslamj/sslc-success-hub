/**
 * Gamification engine hook. One place that:
 *  - generates daily missions (persisted per dayKey)
 *  - maintains multi-kind streak ledgers
 *  - aggregates total + per-subject XP and level + journey tier
 *  - exposes `grantXp` and `advanceMission` for callers (sessions, scans, quizzes)
 *
 * Transparent guest fallback: when the uid looks anonymous we mirror writes
 * to the local store. Once Firebase Auth is wired the same call sites
 * persist to Firestore without code changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnalytics } from "./use-analytics";
import { useAuthOptional } from "@/contexts/auth-context";
import { toDayKey } from "@/integrations/firebase/services/analytics";
import {
  computeXpGrant,
  computeJourneyTier,
  journeyProgress,
  computeStreakLedgers,
  generateMissions,
  advanceMission,
  isStreakMilestone,
  type MissionContext,
} from "@/lib/gamification";
import {
  appendXpLocal,
  readXpLocal,
  writeLevelLocal,
  readMissionsLocal,
  upsertMissionsLocal,
  readStreaksLocal,
  upsertStreaksLocal,
  appendRewardLocal,
  readRewardsLocal,
} from "@/lib/gamification/local-store";
import {
  appendXpEntry,
  fetchXpEntries,
  writeLevelSummary,
  fetchMissionsForDay,
  upsertMissions,
  fetchStreakLedgers,
  upsertStreakLedgers,
  appendRewardEvent,
  fetchRewardEvents,
} from "@/integrations/firebase/services/gamification";
import { levelFromXp } from "@/lib/xp";
import type {
  MissionDoc,
  MissionKind,
  RewardEventDoc,
  StreakLedgerDoc,
  XpLedgerDoc,
  XpSource,
} from "@/integrations/firebase/types";

function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export type UseGamificationOptions = {
  dailyGoalMinutes?: number;
  daysToExam?: number;
  weakSubjects?: { id: string; name: string; mastery: number }[];
  revisionDue?: number;
  mockExamThisWeek?: boolean;
};

export function useGamification(opts: UseGamificationOptions = {}) {
  const a = useAnalytics();
  const authCtx = useAuthOptional();
  const isAuthed = Boolean(authCtx?.user?.uid);
  const userId = a.userId;
  const dayKey = toDayKey(new Date());

  const [xpEntries, setXpEntries] = useState<XpLedgerDoc[]>([]);
  const [missions, setMissions] = useState<MissionDoc[]>([]);
  const [streakLedgers, setStreakLedgers] = useState<StreakLedgerDoc[]>([]);
  const [rewards, setRewards] = useState<RewardEventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const grantedStreakDaysRef = useRef<Set<string>>(new Set());

  // ---------- Initial hydration ----------
  useEffect(() => {
    let alive = true;
    if (!userId) return;
    (async () => {
      try {
        if (isAuthed) {
          const [xp, ms, sl, rw] = await Promise.all([
            fetchXpEntries(userId),
            fetchMissionsForDay(userId, dayKey),
            fetchStreakLedgers(userId),
            fetchRewardEvents(userId),
          ]);
          if (!alive) return;
          setXpEntries(xp);
          setMissions(ms);
          setStreakLedgers(sl);
          setRewards(rw);
        } else {
          setXpEntries(readXpLocal(userId));
          setMissions(readMissionsLocal(userId, dayKey));
          setStreakLedgers(readStreaksLocal(userId));
          setRewards(readRewardsLocal(userId));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, isAuthed, dayKey]);

  // ---------- Ensure today's missions exist ----------
  useEffect(() => {
    if (!userId || loading) return;
    if (missions.some((m) => m.dayKey === dayKey)) return;
    const ctx: MissionContext = {
      userId,
      dayKey,
      dailyGoalMinutes: opts.dailyGoalMinutes ?? 60,
      weakSubjects: opts.weakSubjects ?? [],
      daysToExam: opts.daysToExam ?? 120,
      revisionDue: opts.revisionDue ?? 0,
      mockExamThisWeek: opts.mockExamThisWeek ?? false,
    };
    const fresh = generateMissions(ctx);
    if (!fresh.length) return;
    setMissions((prev) => [...prev.filter((m) => m.dayKey !== dayKey), ...fresh]);
    if (isAuthed) void upsertMissions(fresh).catch(() => undefined);
    else upsertMissionsLocal(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading, dayKey]);

  // ---------- Recompute + persist streak ledgers when sessions change ----------
  useEffect(() => {
    if (!userId || a.loading) return;
    const weakIds = (opts.weakSubjects ?? []).map((s) => s.id);
    const next = computeStreakLedgers({
      userId,
      sessions: a.recentSessions,
      weakSubjectIds: weakIds,
    });
    setStreakLedgers(next);
    if (isAuthed) void upsertStreakLedgers(next).catch(() => undefined);
    else upsertStreaksLocal(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, a.loading, a.recentSessions.length]);

  // ---------- Helpers ----------
  const persistXp = useCallback(
    async (entry: XpLedgerDoc) => {
      if (isAuthed) await appendXpEntry(entry).catch(() => undefined);
      else appendXpLocal(entry);
    },
    [isAuthed],
  );

  const persistReward = useCallback(
    async (evt: RewardEventDoc) => {
      if (isAuthed) await appendRewardEvent(evt).catch(() => undefined);
      else appendRewardLocal(evt);
    },
    [isAuthed],
  );

  /** Award XP for an event. Idempotent if `refId` already exists in the ledger. */
  const grantXp = useCallback(
    async (input: {
      source: XpSource;
      amount?: number;
      subjectId?: string;
      refId?: string;
      label?: string;
      minutes?: number;
      items?: number;
      accuracy?: number;
      confidence?: number;
      difficulty?: number;
      streakDays?: number;
      recoveryDelta?: number;
    }) => {
      if (!userId) return null;
      if (input.refId && xpEntries.some((x) => x.refId === input.refId)) return null;
      const amount =
        input.amount ??
        computeXpGrant({
          source: input.source,
          minutes: input.minutes,
          items: input.items,
          accuracy: input.accuracy,
          confidence: input.confidence,
          difficulty: input.difficulty,
          streakDays: input.streakDays,
          recoveryDelta: input.recoveryDelta,
        }).amount;
      if (amount <= 0) return null;
      const entry: XpLedgerDoc = {
        id: rid("xp"),
        userId,
        amount,
        source: input.source,
        subjectId: input.subjectId,
        refId: input.refId,
        label: input.label,
        dayKey,
        createdAt: Date.now(),
      };
      setXpEntries((prev) => [...prev, entry]);
      await persistXp(entry);
      const evt: RewardEventDoc = {
        id: rid("rwd"),
        userId,
        kind: "xp_grant",
        title: input.label ?? `+${amount} XP`,
        xp: amount,
        refId: input.refId,
        dayKey,
        createdAt: Date.now(),
      };
      setRewards((prev) => [...prev, evt]);
      await persistReward(evt);
      return entry;
    },
    [userId, xpEntries, dayKey, persistXp, persistReward],
  );

  /** Advance the first incomplete mission of a kind by `amount` units. */
  const advanceMissionByKind = useCallback(
    async (kind: MissionKind, amount: number) => {
      if (!userId || !amount) return;
      const target = missions.find((m) => m.kind === kind && m.dayKey === dayKey && !m.completed);
      if (!target) return;
      const { doc: next, newlyCompleted } = advanceMission(target, amount);
      setMissions((prev) => prev.map((m) => (m.id === next.id ? next : m)));
      if (isAuthed) void upsertMissions([next]).catch(() => undefined);
      else upsertMissionsLocal([next]);
      if (newlyCompleted) {
        await grantXp({
          source: "mission",
          amount: next.xpReward,
          label: `Mission: ${next.title}`,
          refId: `mission_${next.id}`,
        });
        const evt: RewardEventDoc = {
          id: rid("rwd"),
          userId,
          kind: "mission_complete",
          title: next.title,
          xp: next.xpReward,
          refId: next.id,
          dayKey,
          createdAt: Date.now(),
        };
        setRewards((prev) => [...prev, evt]);
        await persistReward(evt);
      }
    },
    [userId, missions, dayKey, isAuthed, grantXp, persistReward],
  );

  // ---------- Aggregates ----------
  const totalXp = useMemo(() => xpEntries.reduce((s, x) => s + x.amount, 0), [xpEntries]);
  const bySubject = useMemo(() => {
    const out: Record<string, number> = {};
    for (const x of xpEntries) {
      if (x.subjectId) out[x.subjectId] = (out[x.subjectId] ?? 0) + x.amount;
    }
    return out;
  }, [xpEntries]);
  const level = useMemo(() => levelFromXp(totalXp), [totalXp]);
  const studyStreak = streakLedgers.find((s) => s.kind === "study")?.current ?? 0;
  const journey = useMemo(() => computeJourneyTier(totalXp, studyStreak), [totalXp, studyStreak]);
  const journeyPct = useMemo(
    () => journeyProgress(totalXp, studyStreak),
    [totalXp, studyStreak],
  );

  // ---------- Auto-grant streak-day XP (idempotent per day) ----------
  useEffect(() => {
    if (!userId || studyStreak <= 0) return;
    const refId = `streak_day_${dayKey}`;
    if (grantedStreakDaysRef.current.has(refId)) return;
    if (xpEntries.some((x) => x.refId === refId)) {
      grantedStreakDaysRef.current.add(refId);
      return;
    }
    grantedStreakDaysRef.current.add(refId);
    void grantXp({
      source: "streak_day",
      streakDays: studyStreak,
      refId,
      label: `Day ${studyStreak} streak`,
    });
    if (isStreakMilestone(studyStreak)) {
      const evt: RewardEventDoc = {
        id: rid("rwd"),
        userId,
        kind: "streak_milestone",
        title: `${studyStreak}-day streak!`,
        detail: "Subtle, steady, unstoppable.",
        refId,
        dayKey,
        createdAt: Date.now(),
      };
      setRewards((prev) => [...prev, evt]);
      void persistReward(evt);
    }
  }, [userId, studyStreak, dayKey, xpEntries, grantXp, persistReward]);

  // ---------- Persist level summary ----------
  useEffect(() => {
    if (!userId) return;
    const summary = {
      id: "summary",
      userId,
      totalXp,
      level: level.level,
      xpIntoLevel: level.xpIntoLevel,
      xpForNextLevel: level.xpForNextLevel,
      bySubject,
      journeyTier: journey.id,
      updatedAt: Date.now(),
    };
    if (isAuthed) void writeLevelSummary(summary).catch(() => undefined);
    else writeLevelLocal(summary);
  }, [userId, totalXp, level.level, level.xpIntoLevel, level.xpForNextLevel, bySubject, journey.id, isAuthed]);

  const todaysMissions = useMemo(
    () => missions.filter((m) => m.dayKey === dayKey),
    [missions, dayKey],
  );

  return {
    loading,
    userId,
    totalXp,
    bySubject,
    level,
    journey,
    journeyProgress: journeyPct,
    streakLedgers,
    todaysMissions,
    rewards: rewards.slice(-20).reverse(),
    grantXp,
    advanceMissionByKind,
  };
}

export type UseGamification = ReturnType<typeof useGamification>;