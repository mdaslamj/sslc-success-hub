/**
 * Smart revision planner — pure, deterministic, no I/O.
 *
 * Given subjects + recent study sessions + streak state, score each subject
 * and return ranked recommendations of what to revise next.
 *
 * Scoring (higher = more urgent to revise):
 *   +35  per weak topic (capped at 70)
 *   +30 × (1 - completion/100)               — less-completed = higher priority
 *   +25  if no session in the last 3 days     — staleness penalty
 *   +15  if subject minutes share is < 50% of fair share
 *   +20  streak-saver bonus on weakest subject if user hasn't studied today
 *        and current streak > 0
 *
 * The same function powers UI today and a future server-side recommender.
 */

import { toDayKey } from "@/integrations/firebase/services/analytics";
import type { StudySessionDoc } from "@/integrations/firebase/types";

export type RevisionSubjectInput = {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  completion: number; // 0..100
  weakTopics: string[];
  chaptersDone: number;
  chaptersTotal: number;
};

export type RevisionRecommendation = {
  subjectId: string;
  name: string;
  color: string;
  emoji?: string;
  /** Best-effort topic / chapter label to revise. */
  topic: string;
  /** Recommended block length in minutes. */
  suggestedMinutes: number;
  /** Why this surfaced — human-readable reason chips. */
  reasons: string[];
  /** Raw score for debugging / sorting. */
  score: number;
  /** Days since last studied (null = never). */
  daysSinceLast: number | null;
  /** Minutes logged in the lookback window. */
  recentMinutes: number;
};

export type RevisionPlannerInput = {
  subjects: RevisionSubjectInput[];
  sessions: Pick<StudySessionDoc, "subjectId" | "dayKey" | "durationMinutes">[];
  streak: { current: number; longest: number };
  /** Lookback window for "recent" — defaults to 7 days. */
  lookbackDays?: number;
  today?: Date;
  /** How many recommendations to return — defaults to 3. */
  limit?: number;
};

function daysBetween(a: string, b: string): number {
  const ad = new Date(a).getTime();
  const bd = new Date(b).getTime();
  return Math.round((bd - ad) / 86_400_000);
}

/** Default revision block length scaled to urgency. */
function pickBlockLength(score: number): number {
  if (score >= 90) return 45;
  if (score >= 60) return 30;
  if (score >= 30) return 25;
  return 20;
}

export function recommendRevisions(
  input: RevisionPlannerInput,
): RevisionRecommendation[] {
  const today = input.today ?? new Date();
  const todayKey = toDayKey(today);
  const lookbackDays = input.lookbackDays ?? 7;
  const limit = input.limit ?? 3;

  // Aggregate session minutes per subject within the lookback window.
  const recentBySubject = new Map<string, { minutes: number; lastDay: string | null }>();
  for (const s of input.sessions) {
    if (!s.subjectId) continue;
    const dist = daysBetween(s.dayKey, todayKey);
    if (dist < 0 || dist > lookbackDays) continue;
    const cur = recentBySubject.get(s.subjectId) ?? { minutes: 0, lastDay: null };
    cur.minutes += s.durationMinutes ?? 0;
    if (!cur.lastDay || s.dayKey > cur.lastDay) cur.lastDay = s.dayKey;
    recentBySubject.set(s.subjectId, cur);
  }

  const totalRecent = Array.from(recentBySubject.values()).reduce(
    (a, b) => a + b.minutes,
    0,
  );
  const fairShare = input.subjects.length
    ? totalRecent / input.subjects.length
    : 0;

  const studiedToday = input.sessions.some((s) => s.dayKey === todayKey);

  const scored = input.subjects.map((subj) => {
    const recent = recentBySubject.get(subj.id);
    const daysSinceLast = recent?.lastDay ? daysBetween(recent.lastDay, todayKey) : null;
    const recentMinutes = recent?.minutes ?? 0;

    const reasons: string[] = [];
    let score = 0;

    const weakScore = Math.min(70, subj.weakTopics.length * 35);
    if (weakScore > 0) {
      score += weakScore;
      reasons.push(`${subj.weakTopics.length} weak topic${subj.weakTopics.length > 1 ? "s" : ""}`);
    }

    const gapScore = Math.round(30 * (1 - subj.completion / 100));
    if (gapScore >= 8) {
      score += gapScore;
      reasons.push(`${100 - subj.completion}% syllabus remaining`);
    }

    if (daysSinceLast === null) {
      score += 25;
      reasons.push("Never studied in window");
    } else if (daysSinceLast >= 3) {
      score += 25;
      reasons.push(`Stale · last touched ${daysSinceLast}d ago`);
    }

    if (fairShare > 0 && recentMinutes < fairShare * 0.5) {
      score += 15;
      reasons.push("Under-allocated time");
    }

    return { subj, score, reasons, daysSinceLast, recentMinutes };
  });

  scored.sort((a, b) => b.score - a.score);

  // Streak-saver: nudge the user back if they haven't studied today.
  if (!studiedToday && input.streak.current > 0 && scored[0]) {
    scored[0].score += 20;
    scored[0].reasons.unshift(`Save your ${input.streak.current}-day streak`);
  }

  return scored.slice(0, limit).map(({ subj, score, reasons, daysSinceLast, recentMinutes }) => ({
    subjectId: subj.id,
    name: subj.name,
    color: subj.color,
    emoji: subj.emoji,
    topic: subj.weakTopics[0] ?? `Revise ${subj.name}`,
    suggestedMinutes: pickBlockLength(score),
    reasons,
    score,
    daysSinceLast,
    recentMinutes,
  }));
}