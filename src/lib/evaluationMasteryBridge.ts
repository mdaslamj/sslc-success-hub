import type { EvaluationReport } from "@/lib/paperEvaluationEngine";
import type { NewSessionInput } from "@/engines/sessionLogger";
import type { Subject } from "@/types/aura-engine-contracts";

export interface MasteryBridgeResult {
  sessionsAppended: number;
  masteryUpdatesApplied: number;
  probabilityShiftEstimate: number;
  chaptersImproved: string[];
  chaptersDeclined: string[];
  replanTriggered: boolean;
}

export type UpdateMasteryFn = (subject: Subject, chapterId: string, newMastery: number) => void;
export type AppendSessionFn = (session: NewSessionInput) => void;

function toAuraSubject(subjectId: string): Subject | null {
  if (subjectId === "math" || subjectId === "mathematics") return "math";
  if (subjectId === "science") return "science";
  if (subjectId === "social" || subjectId === "social-science" || subjectId === "social_science") {
    return "social";
  }
  return null;
}

export async function applyEvaluationToProfile(
  report: EvaluationReport,
  updateMastery: UpdateMasteryFn,
  appendSession: AppendSessionFn,
): Promise<MasteryBridgeResult> {
  const chaptersImproved: string[] = [];
  const chaptersDeclined: string[] = [];
  let masteryUpdatesApplied = 0;

  const subject = toAuraSubject(report.subjectId);
  if (!subject) {
    return {
      sessionsAppended: 0,
      masteryUpdatesApplied: 0,
      probabilityShiftEstimate: 0,
      chaptersImproved: [],
      chaptersDeclined: [],
      replanTriggered: report.subjectSummary.weakChapters.length >= 2,
    };
  }

  // STEP A — Apply mastery updates for each chapter
  for (const update of report.masteryUpdates) {
    updateMastery(subject, update.chapterId, update.newMastery);
    masteryUpdatesApplied += 1;

    if (update.delta > 0) {
      chaptersImproved.push(update.chapterId);
    } else if (update.delta < -5) {
      chaptersDeclined.push(update.chapterId);
    }
  }

  // STEP B — Append one session per chapter tested (history + burnout signals)
  const uniqueChapters = [...new Set(report.masteryUpdates.map((u) => u.chapterId))];

  for (const chapterId of uniqueChapters) {
    appendSession({
      date: report.date,
      subject,
      chapter: chapterId,
      durationMinutes: 180,
      questionsAttempted: 0,
      questionsCorrect: 0,
      score: report.percentage,
      hintsUsed: 0,
      retriesOnWrong: 0,
      completedPlan: true,
      panicSignal: false,
      engineType: "timed_test",
    });
  }

  // STEP C — Replan if chapters declined or multiple weak chapters flagged
  const replanTriggered =
    chaptersDeclined.length > 0 || report.subjectSummary.weakChapters.length >= 2;

  // STEP D — Estimate probability shift from average mastery delta
  const avgDelta =
    report.masteryUpdates.length > 0
      ? report.masteryUpdates.reduce((sum, update) => sum + update.delta, 0) /
        report.masteryUpdates.length
      : 0;

  const probabilityShiftEstimate = Math.round(avgDelta * 0.3 * 10) / 10;

  return {
    sessionsAppended: uniqueChapters.length,
    masteryUpdatesApplied,
    probabilityShiftEstimate,
    chaptersImproved,
    chaptersDeclined,
    replanTriggered,
  };
}
