import { useState } from "react";
import type {
  AnalyticsState,
  ScoreProjectionOutput,
  StudentLearningProfile,
  Subject,
} from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { numericFontStyle, SUBJECT_COLORS } from "@/lib/design-tokens";
import { getMasteryStatus } from "@/lib/taskPriorityEngine";

const SUBJECT_LABEL: Record<string, string> = {
  math: "Math",
  science: "Science",
  social: "Social",
};

const SUBJECT_COLOR: Record<string, string> = SUBJECT_COLORS;

type LayoutDensity = AdaptiveTheme["layoutDensity"];

type SubjectHeatmapProps = {
  projection: ScoreProjectionOutput;
  profile: StudentLearningProfile;
  analytics: AnalyticsState;
  theme: AdaptiveTheme;
  layoutDensity: LayoutDensity;
};

export function SubjectHeatmap({
  projection,
  profile,
  analytics,
  theme,
  layoutDensity,
}: SubjectHeatmapProps) {
  const [expandedSubject, setExpandedSubject] = useState<Subject | null>(null);
  const drillDownEnabled = layoutDensity === "advanced";

  const subjectRows = (["math", "science", "social"] as Subject[]).map((subject) => ({
    subject,
    label: SUBJECT_LABEL[subject] ?? subject,
    color: SUBJECT_COLOR[subject] ?? theme.primary,
    percentage: projection?.bySubject?.[subject]?.percentage ?? 0,
    predicted: projection?.bySubject?.[subject]?.predicted ?? 0,
    max: projection?.bySubject?.[subject]?.max ?? 0,
  }));

  return (
    <div className="overflow-y-auto rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Subject Balance
      </div>
      <div className="space-y-3">
        {subjectRows.map((row, idx) => {
          const isExpanded = drillDownEnabled && expandedSubject === row.subject;
          const chapters = Object.entries(profile?.chapterMastery?.[row.subject] ?? {}).sort(
            (a, b) => a[1].mastery - b[1].mastery,
          );

          return (
            <div key={row.subject}>
              <button
                type="button"
                className="w-full text-left"
                disabled={!drillDownEnabled}
                onClick={() => {
                  if (!drillDownEnabled) return;
                  setExpandedSubject(isExpanded ? null : row.subject);
                }}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span style={{ color: row.color }}>{row.label}</span>
                  <span className="flex items-center gap-2 text-slate-400">
                    <span className="tabular-nums" style={numericFontStyle}>
                      {row.predicted.toFixed(1)}/{row.max} marks
                    </span>
                    {drillDownEnabled ? (
                      <span className="text-[10px] text-slate-500">{isExpanded ? "▾" : "▸"}</span>
                    ) : null}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#050c1c]">
                  <div
                    className="aura-bar h-full rounded-full"
                    style={{
                      ["--bar-target" as never]: `${row.percentage}%`,
                      animationDelay: `${idx * 100}ms`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </button>

              {isExpanded ? (
                <div className="mt-2 space-y-1 border-l border-[#1a2744] pl-2">
                  {chapters.map(([chapterId, entry]) => (
                    <div
                      key={chapterId}
                      className="flex items-center justify-between text-[11px] text-slate-400"
                    >
                      <span className="truncate capitalize">{chapterId.replace(/_/g, " ")}</span>
                      {layoutDensity === "advanced" ? (
                        <span
                          className="shrink-0 tabular-nums"
                          style={{
                            color: getMasteryStatus(entry.mastery).color,
                            ...numericFontStyle,
                          }}
                        >
                          {entry.mastery}%
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-slate-400">
        Analytics health:{" "}
        <span className="tabular-nums" style={numericFontStyle}>
          {analytics?.overallHealthScore ?? 0}/100
        </span>
        {" · "}
        {theme.tone ?? ""}
      </div>
    </div>
  );
}
