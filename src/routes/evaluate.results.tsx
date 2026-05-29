import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuraCausalityChain from "@/components/AuraCausalityChain";
import EvaluationResults from "@/components/exam/EvaluationResults";
import GapAnalysisView from "@/components/exam/GapAnalysisView";
import type { CausalityChain } from "@/core/academic-state/masteryEngine";
import type { MasteryBridgeResult } from "@/lib/evaluationMasteryBridge";
import type { EvaluationReport } from "@/lib/paperEvaluationEngine";
import {
  EVAL_BRIDGE_STORAGE_KEY,
  EVAL_REPORT_STORAGE_KEY,
} from "@/routes/evaluate";
import { notifyEvaluationComplete } from "@/lib/notifications";

export const Route = createFileRoute("/evaluate/results")({
  head: () => ({
    meta: [{ title: "Aura — Evaluation Results" }],
  }),
  component: EvaluateResultsPage,
});

const SUBJECT_COLORS: Record<string, string> = {
  science: "#38BDF8",
  math: "#FBBF24",
  social: "#4ADE80",
};

const SUBJECT_LABELS: Record<string, string> = {
  science: "Science",
  math: "Mathematics",
  social: "Social Science",
};

function buildEvaluationCausalityChain(
  report: EvaluationReport,
  bridge: MasteryBridgeResult | null,
): CausalityChain {
  const subjectLabel = SUBJECT_LABELS[report.subjectId] ?? report.subjectId;
  const subjectColor = SUBJECT_COLORS[report.subjectId] ?? "#8B5CF6";
  const probShift = bridge?.probabilityShiftEstimate ?? 0;
  const masteryCount = bridge?.masteryUpdatesApplied ?? report.masteryUpdates.length;

  return {
    subjectName: subjectLabel,
    subjectColor,
    needsReplan: bridge?.replanTriggered ?? report.subjectSummary.weakChapters.length >= 2,
    summary: `Paper evaluated — ${report.scoredMarks}/${report.totalMarks} marks (${report.grade}).`,
    nodes: [
      {
        id: "session",
        icon: "✓",
        label: "Session complete",
        value: `${report.questionResults.length} questions`,
        sub: "Answer script processed and graded",
        color: "#4ADE80",
      },
      {
        id: "mastery",
        icon: "📈",
        label: "Mastery updated",
        value: `${masteryCount} chapter${masteryCount === 1 ? "" : "s"}`,
        sub: "Profile updated from your marks",
        color: subjectColor,
      },
      {
        id: "probability",
        icon: "◎",
        label: "Probability shifted",
        value: probShift >= 0 ? `+${probShift}%` : `${probShift}%`,
        sub: `${subjectLabel} exam readiness estimate`,
        color: probShift >= 0 ? "#4ADE80" : "#F87171",
      },
      {
        id: "plan",
        icon: "📋",
        label: "Plan adapted",
        value: bridge?.replanTriggered ? "Revised" : "Updated",
        sub: bridge?.replanTriggered
          ? "Weak chapters added to your planner"
          : "Study plan refreshed with new data",
        color: "#8B5CF6",
      },
    ],
  };
}

function readStoredResults(): {
  report: EvaluationReport | null;
  bridge: MasteryBridgeResult | null;
} {
  if (typeof window === "undefined") {
    return { report: null, bridge: null };
  }
  try {
    const reportRaw = sessionStorage.getItem(EVAL_REPORT_STORAGE_KEY);
    const bridgeRaw = sessionStorage.getItem(EVAL_BRIDGE_STORAGE_KEY);
    return {
      report: reportRaw ? (JSON.parse(reportRaw) as EvaluationReport) : null,
      bridge: bridgeRaw ? (JSON.parse(bridgeRaw) as MasteryBridgeResult) : null,
    };
  } catch {
    return { report: null, bridge: null };
  }
}

function EvaluateResultsPage() {
  const navigate = useNavigate();
  const { report, bridge } = useMemo(readStoredResults, []);
  const [showChain, setShowChain] = useState(true);

  const causalityChain = useMemo(
    () => (report ? buildEvaluationCausalityChain(report, bridge) : null),
    [report, bridge],
  );

  useEffect(() => {
    if (!report) return;
    const key = `aura.eval_notified.${report.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const subjectLabel = SUBJECT_LABELS[report.subjectId] ?? report.subjectId;
    notifyEvaluationComplete({
      subject: subjectLabel,
      scoredMarks: report.scoredMarks,
      totalMarks: report.totalMarks,
      grade: report.grade,
    });
  }, [report]);

  useEffect(() => {
    if (!showChain) return;
    const timer = window.setTimeout(() => setShowChain(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showChain]);

  const handleViewPlan = useCallback(() => {
    void navigate({ to: "/planner" });
  }, [navigate]);

  const handleRetake = useCallback(() => {
    sessionStorage.removeItem(EVAL_REPORT_STORAGE_KEY);
    sessionStorage.removeItem(EVAL_BRIDGE_STORAGE_KEY);
    void navigate({ to: "/evaluate" });
  }, [navigate]);

  if (!report) {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
        style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <p className="text-white/70">No evaluation results found.</p>
        <Link to="/evaluate" className="mt-4 text-[#8B5CF6] underline">
          Upload a paper
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto min-h-[100dvh] max-w-lg px-4 py-6"
      style={{ background: "#08080E" }}
    >
      <EvaluationResults
        report={report}
        bridgeResult={bridge}
        onViewPlan={handleViewPlan}
        onRetake={handleRetake}
      />

      <div className="mt-6">
        <GapAnalysisView report={report} />
      </div>

      {showChain && causalityChain ? (
        <div
          className="fixed inset-x-0 bottom-24 z-50 mx-auto max-w-lg px-4"
          onClick={() => setShowChain(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowChain(false)}
          role="presentation"
        >
          <AuraCausalityChain
            chain={causalityChain}
            onDismiss={() => setShowChain(false)}
            className="shadow-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}
