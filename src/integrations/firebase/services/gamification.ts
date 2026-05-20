/**
 * Firestore service surface for the Gamification + Student Reward System.
 * All collections live under users/{uid}/* and are owner-gated by rules.
 * Guest (unauthenticated) callers should use the local-store mirror.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, GAMIFICATION_SUBCOLLECTIONS } from "../config";
import type {
  LevelSummaryDoc,
  MissionDoc,
  RewardEventDoc,
  StreakLedgerDoc,
  XpLedgerDoc,
} from "../types";

const userCol = (uid: string, sub: string) => collection(db, "users", uid, sub);
const userDoc = (uid: string, sub: string, id: string) =>
  doc(db, "users", uid, sub, id);

// ---------- XP ledger ----------
export async function appendXpEntry(entry: XpLedgerDoc): Promise<void> {
  await setDoc(userDoc(entry.userId, GAMIFICATION_SUBCOLLECTIONS.XP, entry.id), entry);
}
export async function fetchXpEntries(userId: string): Promise<XpLedgerDoc[]> {
  const snap = await getDocs(userCol(userId, GAMIFICATION_SUBCOLLECTIONS.XP));
  return snap.docs.map((d) => d.data() as XpLedgerDoc);
}

// ---------- Level summary (singleton "summary") ----------
export async function fetchLevelSummary(userId: string): Promise<LevelSummaryDoc | null> {
  const snap = await getDoc(userDoc(userId, GAMIFICATION_SUBCOLLECTIONS.LEVELS, "summary"));
  return snap.exists() ? (snap.data() as LevelSummaryDoc) : null;
}
export async function writeLevelSummary(level: LevelSummaryDoc): Promise<void> {
  await setDoc(
    userDoc(level.userId, GAMIFICATION_SUBCOLLECTIONS.LEVELS, "summary"),
    level,
    { merge: true },
  );
}

// ---------- Missions ----------
export async function fetchMissionsForDay(
  userId: string,
  dayKey: string,
): Promise<MissionDoc[]> {
  const q = query(
    userCol(userId, GAMIFICATION_SUBCOLLECTIONS.MISSIONS),
    where("dayKey", "==", dayKey),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MissionDoc);
}
export async function upsertMissions(missions: MissionDoc[]): Promise<void> {
  if (!missions.length) return;
  const batch = writeBatch(db);
  for (const m of missions) {
    batch.set(
      userDoc(m.userId, GAMIFICATION_SUBCOLLECTIONS.MISSIONS, m.id),
      m,
      { merge: true },
    );
  }
  await batch.commit();
}

// ---------- Streaks ledger ----------
export async function fetchStreakLedgers(userId: string): Promise<StreakLedgerDoc[]> {
  const snap = await getDocs(userCol(userId, GAMIFICATION_SUBCOLLECTIONS.STREAKS_LEDGER));
  return snap.docs.map((d) => d.data() as StreakLedgerDoc);
}
export async function upsertStreakLedgers(ledgers: StreakLedgerDoc[]): Promise<void> {
  if (!ledgers.length) return;
  const batch = writeBatch(db);
  for (const s of ledgers) {
    batch.set(
      userDoc(s.userId, GAMIFICATION_SUBCOLLECTIONS.STREAKS_LEDGER, s.id),
      s,
      { merge: true },
    );
  }
  await batch.commit();
}

// ---------- Reward history ----------
export async function appendRewardEvent(evt: RewardEventDoc): Promise<void> {
  await setDoc(
    userDoc(evt.userId, GAMIFICATION_SUBCOLLECTIONS.REWARD_HISTORY, evt.id),
    evt,
  );
}
export async function fetchRewardEvents(userId: string): Promise<RewardEventDoc[]> {
  const snap = await getDocs(userCol(userId, GAMIFICATION_SUBCOLLECTIONS.REWARD_HISTORY));
  return snap.docs.map((d) => d.data() as RewardEventDoc);
}