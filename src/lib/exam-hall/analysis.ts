import type {
  BoardSimulationResultDoc,
  ExamHallSessionDoc,
  InvigilatorEventDoc,
  TimingAnalyticsDoc,
} from "@/integrations/firebase/types";
import { sectionMarks, sectionTimeBalance } from "./invigilator";
import { evaluatePresentation } from "./presentation";

/**
 * Compute timing analytics from a finished hall session.
 */
export function buildTimingAnalytics(
  session: ExamHallSessionDoc,
): Omit<TimingAnalyticsDoc, "id"> {
  const perSection = session.sections.map((sec) => {
    const balance = sectionTimeBalance(session).find((b) => b.sectionId === sec.id)!;
    const avgPer = sec.questions.length > 0 ? balance.spentSec / sec.questions.length : 0;
    return {
      sectionId: sec.id,
      allocSec: balance.allocSec,
      spentSec: balance.spentSec,
      overspendSec: balance.overspendSec,
      avgPerQuestionSec: avgPer,
    };
  });

  const totalAllocatedSec = session.totalDurationSec;
  const totalSpentSec = perSection.reduce((s, p) => s + p.spentSec, 0);

  // Balance = 1 minus normalised overspend.
  const overspend = perSection.reduce((s, p) => s + p.overspendSec, 0);
  const balanceScore = Math.max(
    0,
    Math.min(1, 1 - overspend / Math.max(totalAllocatedSec, 1)),
  );

  const allAnswers = Object.values(session.answers);
  const slowest = [...allAnswers].sort((a, b) => b.timeSpentSec - a.timeSpentSec)[0];
  const fastest = [...allAnswers]
    .filter((a) => (a.text?.length ?? 0) > 0)
    .sort((a, b) => a.timeSpentSec - b.timeSpentSec)[0];

  return {
    userId: session.userId,
    sessionId: session.id,
    perSection,
    totalAllocatedSec,
    totalSpentSec,
    balanceScore,
    slowestQuestionId: slowest?.questionId,
    fastestQuestionId: fastest?.questionId,
    createdAt: Date.now(),
  };
}

/**
 * Post-exam AI analysis — predicted marks, weak areas, presentation,
 * confidence trend and the revision plan.
 */
export function buildSimulationResult(args: {
  session: ExamHallSessionDoc;
  events: InvigilatorEventDoc[];
  timing: Omit<TimingAnalyticsDoc, "id">;
}): Omit<BoardSimulationResultDoc, "id"> {
  const { session, events, timing } = args;

  const presentation = evaluatePresentation(session);

  let predictedMarks = 0;
  const perSection = session.sections.map((sec) => {
    let scored = 0;
    sec.questions.forEach((q) => {
      const a = session.answers[q.id];
      const length = a?.text?.trim().length ?? 0;
      if (length === 0) return;
      // Heuristic — short complete answers get partial; long answers
      // weighted by structure + keyword coverage.
      const baseFactor =
        q.kind === "mcq"
          ? length > 0
            ? 0.7
            : 0
          : Math.min(1, length / 220);
      const quality =
        (presentation.structureScore + presentation.keywordCoverage) / 2;
      scored += q.marks * (0.55 * baseFactor + 0.45 * quality);
    });
    scored = Math.min(sectionMarks(sec), scored);
    predictedMarks += scored;
    return {
      sectionId: sec.id,
      scored: Math.round(scored),
      outOf: sectionMarks(sec),
    };
  });

  predictedMarks = Math.round(predictedMarks);
  const outOf = session.totalMarks;
  const predictedPct = outOf > 0 ? predictedMarks / outOf : 0;
  const marksAtRisk = Math.max(0, outOf - predictedMarks);

  // Weak areas — sections under 60% scoring.
  const weakAreas = perSection
    .filter((p) => p.outOf > 0 && p.scored / p.outOf < 0.6)
    .map((p) => {
      const sec = session.sections.find((s) => s.id === p.sectionId);
      return {
        label: sec?.title ?? p.sectionId,
        gap: Math.round(((p.outOf - p.scored) / p.outOf) * 100),
      };
    });

  // Confidence trend — slope of correct-ish answers across the paper.
  const trendValues = Object.values(session.answers).map(
    (a) => Math.min(1, (a.text?.length ?? 0) / 200),
  );
  const confidenceTrend = classifyTrend(trendValues);

  const revisionRecommendations = weakAreas.map((w) => ({ label: w.label }));

  const overspendSec = timing.perSection.reduce((s, p) => s + p.overspendSec, 0);
  const underspendSec = Math.max(
    0,
    timing.totalAllocatedSec - timing.totalSpentSec,
  );

  return {
    userId: session.userId,
    sessionId: session.id,
    predictedMarks,
    outOf,
    predictedPct,
    marksAtRisk,
    perSection,
    weakAreas,
    presentation,
    timingSummary: {
      balanceScore: timing.balanceScore,
      overspendSec,
      underspendSec,
    },
    confidenceTrend,
    revisionRecommendations,
    invigilatorHighlights: Array.from(new Set(events.map((e) => e.kind))),
    createdAt: Date.now(),
  };
}

function classifyTrend(values: number[]): BoardSimulationResultDoc["confidenceTrend"] {
  if (values.length < 4) return "flat";
  const mid = Math.floor(values.length / 2);
  const first = avg(values.slice(0, mid));
  const second = avg(values.slice(mid));
  const variance = stddev(values);
  if (variance > 0.25) return "volatile";
  if (second - first > 0.1) return "rising";
  if (first - second > 0.1) return "falling";
  return "flat";
}

function avg(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function stddev(xs: number[]) {
  if (xs.length === 0) return 0;
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
}