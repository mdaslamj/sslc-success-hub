/**
 * Guest-mode persistence mirror for gamification data. Mirrors the Firestore
 * service surface so the hook can transparently swap between authenticated
 * and guest users.
 */
import type {
  LevelSummaryDoc,
  MissionDoc,
  RewardEventDoc,
  StreakLedgerDoc,
  XpLedgerDoc,
} from "@/integrations/firebase/types";

const K = {
  XP: "aura.gamify.xp.v1",
  LEVEL: "aura.gamify.level.v1",
  MISSIONS: "aura.gamify.missions.v1",
  STREAKS: "aura.gamify.streaks.v1",
  REWARDS: "aura.gamify.rewards.v1",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

// ---------- XP ledger ----------
export function readXpLocal(userId: string): XpLedgerDoc[] {
  return read<XpLedgerDoc[]>(K.XP, []).filter((x) => x.userId === userId);
}
export function appendXpLocal(doc: XpLedgerDoc) {
  const all = read<XpLedgerDoc[]>(K.XP, []);
  all.push(doc);
  write(K.XP, all.slice(-500));
}

// ---------- Level summary ----------
export function readLevelLocal(userId: string): LevelSummaryDoc | null {
  const all = read<Record<string, LevelSummaryDoc>>(K.LEVEL, {});
  return all[userId] ?? null;
}
export function writeLevelLocal(doc: LevelSummaryDoc) {
  const all = read<Record<string, LevelSummaryDoc>>(K.LEVEL, {});
  all[doc.userId] = doc;
  write(K.LEVEL, all);
}

// ---------- Missions ----------
export function readMissionsLocal(userId: string, dayKey: string): MissionDoc[] {
  return read<MissionDoc[]>(K.MISSIONS, []).filter(
    (m) => m.userId === userId && m.dayKey === dayKey,
  );
}
export function upsertMissionsLocal(missions: MissionDoc[]) {
  if (!missions.length) return;
  const all = read<MissionDoc[]>(K.MISSIONS, []);
  const ids = new Set(missions.map((m) => m.id));
  const kept = all.filter((m) => !ids.has(m.id));
  write(K.MISSIONS, kept.concat(missions).slice(-200));
}

// ---------- Streaks ----------
export function readStreaksLocal(userId: string): StreakLedgerDoc[] {
  return read<StreakLedgerDoc[]>(K.STREAKS, []).filter((s) => s.userId === userId);
}
export function upsertStreaksLocal(streaks: StreakLedgerDoc[]) {
  if (!streaks.length) return;
  const all = read<StreakLedgerDoc[]>(K.STREAKS, []);
  const ids = new Set(streaks.map((s) => `${s.userId}_${s.id}`));
  const kept = all.filter((s) => !ids.has(`${s.userId}_${s.id}`));
  write(K.STREAKS, kept.concat(streaks));
}

// ---------- Reward history ----------
export function readRewardsLocal(userId: string): RewardEventDoc[] {
  return read<RewardEventDoc[]>(K.REWARDS, []).filter((r) => r.userId === userId);
}
export function appendRewardLocal(doc: RewardEventDoc) {
  const all = read<RewardEventDoc[]>(K.REWARDS, []);
  all.push(doc);
  write(K.REWARDS, all.slice(-200));
}