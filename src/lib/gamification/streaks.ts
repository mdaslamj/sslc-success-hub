/**
 * Streak intelligence — multi-kind streak ledger.
 *  - study: any session on a day
 *  - revision: revision-tagged sessions
 *  - recovery: days that touched a weak/chronic topic
 *  - subject: per-subject continuity (one ledger per subject)
 * Plus a consistency score (0..100) over the last 14 days.
 */
import type {
  StreakLedgerDoc,
  StreakKind,
  StudySessionDoc,
} from "@/integrations/firebase/types";
import { toDayKey } from "@/integrations/firebase/services/analytics";

export type StreakInput = {
  userId: string;
  sessions: StudySessionDoc[];
  /** Subject ids of currently chronic-weak topics — drives recovery streak. */
  weakSubjectIds: string[];
};

function buildLedger(
  userId: string,
  kind: StreakKind,
  dayKeys: Set<string>,
  subjectId?: string,
): StreakLedgerDoc {
  const sorted = Array.from(dayKeys).sort();
  let current = 0;
  let longest = 0;
  let last: string | null = null;

  const today = toDayKey(new Date());
  const yesterday = toDayKey(new Date(Date.now() - 86400000));

  // Walk forward computing longest run.
  let run = 0;
  let prev: number | null = null;
  for (const k of sorted) {
    const t = Date.parse(k);
    if (prev != null && t - prev === 86400000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    last = k;
    prev = t;
  }

  // Current run = longest run ending on today or yesterday.
  if (last === today || last === yesterday) {
    current = run;
  }

  // Consistency: distinct active days in last 14.
  let active = 0;
  for (let i = 0; i < 14; i++) {
    const k = toDayKey(new Date(Date.now() - i * 86400000));
    if (dayKeys.has(k)) active += 1;
  }
  const consistencyScore = Math.round((active / 14) * 100);

  return {
    id: subjectId ? `${kind}_${subjectId}` : kind,
    userId,
    kind,
    subjectId,
    current,
    longest,
    lastDayKey: last,
    consistencyScore,
    updatedAt: Date.now(),
  };
}

export function computeStreakLedgers(input: StreakInput): StreakLedgerDoc[] {
  const { userId, sessions, weakSubjectIds } = input;
  const studyDays = new Set<string>();
  const revisionDays = new Set<string>();
  const recoveryDays = new Set<string>();
  const bySubject = new Map<string, Set<string>>();

  for (const s of sessions) {
    studyDays.add(s.dayKey);
    if (s.kind === "revision") revisionDays.add(s.dayKey);
    if (s.subjectId && weakSubjectIds.includes(s.subjectId)) recoveryDays.add(s.dayKey);
    if (s.subjectId) {
      const set = bySubject.get(s.subjectId) ?? new Set<string>();
      set.add(s.dayKey);
      bySubject.set(s.subjectId, set);
    }
  }

  const out: StreakLedgerDoc[] = [
    buildLedger(userId, "study", studyDays),
    buildLedger(userId, "revision", revisionDays),
    buildLedger(userId, "recovery", recoveryDays),
  ];
  for (const [sid, days] of bySubject) {
    out.push(buildLedger(userId, "subject", days, sid));
  }
  return out;
}

/** Streak-day milestones for celebration events. */
export function isStreakMilestone(days: number): boolean {
  return days === 3 || days === 7 || days === 14 || days === 21 || days === 30 || days % 30 === 0;
}