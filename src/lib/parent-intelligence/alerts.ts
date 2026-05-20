/**
 * Parent alerts engine. Takes a student snapshot and derives an alert list,
 * all framed with supportive, fear-free language.
 */
import type {
  ParentAlertDoc,
  ParentAlertKind,
  ParentAlertSeverity,
} from "@/integrations/firebase/types";
import { frameAlertTitle, PARENT_SUGGESTIONS, softenPhrase, type Tone } from "./emotional";

export type StudentSnapshot = {
  studentUid: string;
  studentName?: string;
  todayMinutes: number;
  weeklyMinutes: number;
  plannerCompletionPct: number;
  revisionDue: number;
  /** Days since last revision was completed. */
  daysSinceRevision: number;
  averageConfidence: number; // 1..5
  confidenceTrend: number; // -1..+1
  boardReadiness: number; // 0..100
  readinessDelta: number; // vs last week
  streakCurrent: number;
  weakSubjects: { id: string; name: string; mastery: number }[];
  recentRecoveries: { conceptLabel: string; delta: number }[];
  /** Last study session timestamp, ms. */
  lastStudiedAt?: number;
};

export type GenerateAlertsInput = {
  parentUid: string;
  student: StudentSnapshot;
  dayKey: string;
};

const sevTone: Record<ParentAlertSeverity, Tone> = {
  info: "supportive",
  warning: "gentle_nudge",
  celebration: "celebration",
};

function makeAlert(
  parentUid: string,
  studentUid: string,
  dayKey: string,
  kind: ParentAlertKind,
  severity: ParentAlertSeverity,
  rawTitle: string,
  body: string,
  suggestion?: string,
): ParentAlertDoc {
  const id = `${dayKey}_${kind}_${studentUid}`;
  return {
    id,
    parentUid,
    studentUid,
    kind,
    severity,
    title: frameAlertTitle(sevTone[severity], rawTitle, id),
    body: softenPhrase(body),
    suggestion,
    read: false,
    dayKey,
    createdAt: Date.now(),
  };
}

export function generateParentAlerts(input: GenerateAlertsInput): ParentAlertDoc[] {
  const { parentUid, student: s, dayKey } = input;
  const out: ParentAlertDoc[] = [];

  // 1. Weak subject (only the single weakest, to avoid overwhelm).
  const weakest = s.weakSubjects[0];
  if (weakest && weakest.mastery < 55) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "weak_subject",
        "warning",
        `${weakest.name} needs a little more love`,
        `${s.studentName ?? "Your child"} is at ${Math.round(weakest.mastery)}% mastery in ${weakest.name}. Steady practice will lift this.`,
        PARENT_SUGGESTIONS.weakSubject(weakest.name),
      ),
    );
  }

  // 2. Revision overdue (>3 days since last revision OR many due).
  if (s.daysSinceRevision >= 3 || s.revisionDue >= 5) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "revision_overdue",
        "warning",
        "Revision items piling up",
        `${s.revisionDue} topics are ready for a quick recap.`,
        PARENT_SUGGESTIONS.revisionOverdue(),
      ),
    );
  }

  // 3. Confidence decline.
  if (s.confidenceTrend < -0.15 && s.averageConfidence < 3.2) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "confidence_decline",
        "warning",
        "Confidence dipping a little",
        "Self-reported confidence is trending down this week. Often this is just exam pressure.",
        PARENT_SUGGESTIONS.confidenceDecline(),
      ),
    );
  }

  // 4. Improvement / recovery — celebrate.
  if (s.recentRecoveries.length) {
    const top = s.recentRecoveries[0];
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "recovery",
        "celebration",
        `${top.conceptLabel} is clicking`,
        `Confidence in ${top.conceptLabel} climbed +${top.delta} points. Real growth.`,
        PARENT_SUGGESTIONS.improvement(),
      ),
    );
  } else if (s.readinessDelta >= 4) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "improvement",
        "celebration",
        "Board readiness is climbing",
        `Predicted readiness moved +${s.readinessDelta} points this week.`,
        PARENT_SUGGESTIONS.improvement(),
      ),
    );
  }

  // 5. Board readiness update (info every ~7 days from the day a multiple).
  if (s.boardReadiness > 0 && new Date(dayKey).getDate() % 7 === 0) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "board_readiness",
        "info",
        "Board readiness check-in",
        `On current pace ${s.studentName ?? "they"} are tracking for ~${Math.round(s.boardReadiness)}%.`,
        PARENT_SUGGESTIONS.boardReadiness(),
      ),
    );
  }

  // 6. Streak milestone (celebration).
  if ([3, 7, 14, 21, 30].includes(s.streakCurrent)) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "streak_milestone",
        "celebration",
        `${s.streakCurrent}-day streak!`,
        "Showing up daily is the real predictor of board success.",
      ),
    );
  }

  // 7. Low study time today (gentle nudge after 6pm only).
  if (s.todayMinutes < 10 && new Date().getHours() >= 18) {
    out.push(
      makeAlert(
        parentUid,
        s.studentUid,
        dayKey,
        "low_study_time",
        "info",
        "Quiet study day",
        "Today's logged study time is light. Some days are rest days — and that's healthy.",
        PARENT_SUGGESTIONS.lowStudyTime(),
      ),
    );
  }

  return out;
}