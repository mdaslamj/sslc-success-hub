import type { ReactNode } from "react";
import { Brain, ClipboardList, PenLine } from "lucide-react";
import type { EvaluationReport } from "@/lib/paperEvaluationEngine";
import { formatChapterLabel } from "@/lib/chapter-display";

type Props = {
  report: EvaluationReport;
};

type GapKind = "conceptual" | "procedural" | "expression";

const GAP_CONFIG: Record<
  GapKind,
  {
    icon: ReactNode;
    color: string;
    title: (n: number) => string;
    explanation: string;
    action: string;
  }
> = {
  conceptual: {
    icon: <Brain className="h-5 w-5" aria-hidden />,
    color: "#FBBF24",
    title: (n) => `Concept gaps — ${n} question${n === 1 ? "" : "s"}`,
    explanation:
      "You know how to answer but the underlying concept needs strengthening.",
    action: "Re-read the concept section, then try concept-check questions.",
  },
  procedural: {
    icon: <ClipboardList className="h-5 w-5" aria-hidden />,
    color: "#38BDF8",
    title: (n) => `Procedure gaps — ${n} question${n === 1 ? "" : "s"}`,
    explanation: "You understand the concept but skipped steps in your answer.",
    action: "Practice writing out every step. Use the step-by-step format.",
  },
  expression: {
    icon: <PenLine className="h-5 w-5" aria-hidden />,
    color: "#8B5CF6",
    title: (n) => `Expression gaps — ${n} question${n === 1 ? "" : "s"}`,
    explanation: "Your understanding is correct but the answer format needs work.",
    action: "Practice answer writing. Use 3-point format: define, example, apply.",
  },
};

function countGaps(report: EvaluationReport): Record<GapKind, number> {
  const counts: Record<GapKind, number> = {
    conceptual: 0,
    procedural: 0,
    expression: 0,
  };
  for (const q of report.questionResults) {
    if (q.gapType === "conceptual") counts.conceptual += 1;
    if (q.gapType === "procedural") counts.procedural += 1;
    if (q.gapType === "expression") counts.expression += 1;
  }
  return counts;
}

export default function GapAnalysisView({ report }: Props) {
  const gapCounts = countGaps(report);
  const hasGaps = Object.values(gapCounts).some((n) => n > 0);
  const weakChapters = report.subjectSummary.weakChapters;

  return (
    <section
      className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0F0F18] p-5"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <h2 className="text-lg font-bold text-white">What your gaps tell us</h2>

      {!hasGaps ? (
        <p className="text-sm leading-relaxed text-[#4ADE80]">
          Strong performance — no significant gaps detected. Keep this momentum.
        </p>
      ) : (
        <div className="space-y-4">
          {(Object.keys(GAP_CONFIG) as GapKind[]).map((kind) => {
            const count = gapCounts[kind];
            if (count === 0) return null;
            const config = GAP_CONFIG[kind];
            return (
              <div
                key={kind}
                className="rounded-xl border border-white/[0.06] bg-[#08080E]/60 p-4"
              >
                <div className="flex items-center gap-2" style={{ color: config.color }}>
                  {config.icon}
                  <h3 className="text-sm font-semibold">{config.title(count)}</h3>
                </div>
                <p className="mt-2 text-sm text-white/70">{config.explanation}</p>
                <p className="mt-2 text-xs text-white/55">{config.action}</p>
                {weakChapters.length > 0 ? (
                  <p className="mt-2 text-[11px] text-white/40">
                    Chapters: {weakChapters.map(formatChapterLabel).join(", ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {weakChapters.length > 0 ? (
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
            Added to your plan
          </p>
          <p className="mt-1 text-sm text-white/65">
            These chapters were flagged for revision based on your evaluation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {weakChapters.map((chapterId) => (
              <span
                key={chapterId}
                className="rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3 py-1 text-xs text-violet-200"
              >
                {formatChapterLabel(chapterId)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
