import type { EvaluationReport } from "@/lib/paperEvaluationEngine";
import type { MasteryBridgeResult } from "@/lib/evaluationMasteryBridge";
import { cn } from "@/lib/utils";
import { formatChapterLabel } from "@/lib/chapter-display";

type Props = {
  report: EvaluationReport;
  bridgeResult: MasteryBridgeResult | null;
  onViewPlan: () => void;
  onRetake: () => void;
};

const EXAM_LABELS: Record<EvaluationReport["examType"], string> = {
  chapter: "Chapter Test",
  sa1: "SA1",
  sa2: "SA2",
  preparatory: "Preparatory",
  board: "Board Exam",
};

const SUBJECT_LABELS: Record<string, string> = {
  science: "Science",
  math: "Mathematics",
  social: "Social Science",
  english: "English",
  kannada: "Kannada",
  hindi: "Hindi",
};

function gradeScoreColor(grade: string): string {
  if (grade === "A+" || grade === "A") return "#4ADE80";
  if (grade === "B+" || grade === "B") return "#38BDF8";
  if (grade === "C") return "#FBBF24";
  return "#F87171";
}

function marksRatioColor(awarded: number, total: number): string {
  if (total <= 0) return "#F87171";
  const ratio = awarded / total;
  if (ratio >= 0.75) return "#4ADE80";
  if (ratio >= 0.5) return "#FBBF24";
  return "#F87171";
}

function gapBadge(gapType: EvaluationReport["questionResults"][number]["gapType"]) {
  if (gapType === "conceptual") {
    return { label: "Concept gap", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  }
  if (gapType === "procedural") {
    return { label: "Procedure gap", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
  }
  if (gapType === "expression") {
    return { label: "Expression gap", className: "bg-violet-500/15 text-violet-300 border-violet-500/30" };
  }
  return null;
}

function primaryGapLabel(gap: EvaluationReport["subjectSummary"]["primaryGapType"]): string {
  if (gap === "conceptual") return "Conceptual gaps";
  if (gap === "procedural") return "Procedural gaps";
  if (gap === "expression") return "Expression gaps";
  return "No major gaps";
}

export default function EvaluationResults({
  report,
  bridgeResult,
  onViewPlan,
  onRetake,
}: Props) {
  const scoreColor = gradeScoreColor(report.grade);
  const subjectLabel = SUBJECT_LABELS[report.subjectId] ?? report.subjectId;
  const probShift = bridgeResult?.probabilityShiftEstimate ?? 0;

  return (
    <div
      className="space-y-6 pb-32"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* SECTION 1 — Score header */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0F0F18] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="font-mono text-4xl font-bold tabular-nums"
              style={{ color: scoreColor, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {report.scoredMarks}/{report.totalMarks}
            </p>
            <p className="mt-1 font-mono text-lg text-white/70">{report.percentage}%</p>
            <p className="mt-3 text-sm text-white/55">
              {subjectLabel} · {EXAM_LABELS[report.examType]}
            </p>
            <p className="text-xs text-white/40">{report.date}</p>
          </div>
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold"
            style={{ borderColor: scoreColor, color: scoreColor }}
          >
            {report.grade}
          </div>
        </div>

        {bridgeResult && probShift !== 0 ? (
          <p
            className={cn(
              "mt-4 text-sm font-medium",
              probShift > 0 ? "text-[#4ADE80]" : "text-[#F87171]",
            )}
          >
            {subjectLabel} probability: {probShift > 0 ? "+" : ""}
            {probShift}%
          </p>
        ) : null}
      </section>

      {/* SECTION 2 — Summary strip */}
      <section className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Questions",
            value: String(report.questionResults.length),
          },
          {
            label: "Marks",
            value: `${report.scoredMarks}/${report.totalMarks}`,
          },
          {
            label: "Gap type",
            value: primaryGapLabel(report.subjectSummary.primaryGapType),
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-white/[0.06] bg-[#0F0F18] px-2 py-3 text-center"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40">{tile.label}</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-white">{tile.value}</p>
          </div>
        ))}
      </section>

      {/* SECTION 3 — Per-question breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">
          Question breakdown
        </h2>
        {report.questionResults.map((question) => {
          const badge = gapBadge(question.gapType);
          return (
            <article
              key={question.questionId}
              className="rounded-2xl border border-white/[0.06] bg-[#0F0F18] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase text-white/50">
                    {question.questionId}
                  </span>
                  {badge ? (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  ) : null}
                </div>
                <span
                  className="font-mono text-sm font-bold tabular-nums"
                  style={{
                    color: marksRatioColor(question.marksAwarded, question.marksTotal),
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {question.marksAwarded}/{question.marksTotal}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-white/85">{question.questionText}</p>

              {question.pointsAddressed.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {question.pointsAddressed.map((point) => (
                    <li key={point} className="flex gap-2 text-xs text-[#4ADE80]">
                      <span aria-hidden>✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {question.pointsMissed.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {question.pointsMissed.map((point) => (
                    <li key={point} className="flex gap-2 text-xs text-[#F87171]">
                      <span aria-hidden>✗</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {question.feedbackToStudent ? (
                <div className="mt-3 rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-2.5 text-sm leading-relaxed text-white/90">
                  {question.feedbackToStudent}
                </div>
              ) : null}

              {question.revisionTarget ? (
                <p className="mt-2 text-xs text-amber-300/90">
                  Revise: {question.revisionTarget}
                </p>
              ) : null}

              {question.teacherMark != null && !question.marksMatch ? (
                <p className="mt-2 text-[11px] text-white/40">
                  Teacher: {question.teacherMark}/{question.marksTotal} · Aura:{" "}
                  {question.marksAwarded}/{question.marksTotal} · Under review
                </p>
              ) : null}
            </article>
          );
        })}
      </section>

      {/* SECTION 4 — Mastery updates */}
      {report.masteryUpdates.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">
            Mastery updates
          </h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {report.masteryUpdates.map((update) => (
              <span
                key={update.chapterId}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  update.delta >= 0
                    ? "border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]"
                    : "border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171]",
                )}
              >
                {formatChapterLabel(update.chapterId)}{" "}
                {update.delta >= 0 ? "↑" : "↓"}
                {Math.abs(update.delta)}%
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* SECTION 5 — Actions */}
      <section className="fixed inset-x-0 bottom-0 z-10 border-t border-white/[0.06] bg-[#08080E]/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <button
            type="button"
            className="w-full rounded-2xl bg-[#8B5CF6] py-3.5 text-sm font-semibold text-white"
            onClick={onViewPlan}
          >
            Update my study plan
          </button>
          <button
            type="button"
            className="w-full rounded-2xl border border-white/[0.06] bg-[#0F0F18] py-3.5 text-sm font-semibold text-white"
            onClick={onRetake}
          >
            Evaluate another paper
          </button>
        </div>
      </section>
    </div>
  );
}
