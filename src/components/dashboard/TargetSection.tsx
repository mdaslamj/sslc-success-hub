import type {
  NextActionOutput,
  ScoreProjectionOutput,
  TargetGapOutput,
} from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";

type LayoutDensity = AdaptiveTheme["layoutDensity"];

type TargetSectionProps = {
  projection: ScoreProjectionOutput;
  target: TargetGapOutput;
  nextAction: NextActionOutput;
  theme: AdaptiveTheme;
  layoutDensity: LayoutDensity;
};

export function TargetSection({
  projection,
  target,
  nextAction,
  theme,
  layoutDensity,
}: TargetSectionProps) {
  const showRoiList = layoutDensity !== "simple";
  const roiCount = layoutDensity === "advanced" ? 5 : 5;

  return (
    <div className="overflow-y-auto rounded-xl border border-[#1a2744] bg-[#080f1e] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Target Gap
      </div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div
            className="text-2xl font-black text-slate-100"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            {Math.round(projection.percentage)}%
          </div>
          <div className="text-xs text-slate-400">current prediction</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: theme.accent }}>
            {target.targetScore}%
          </div>
          <div className="text-xs text-slate-400">target</div>
        </div>
      </div>
      <div className="mb-3 text-xs text-slate-400">
        Gap {target.gapPercentage.toFixed(1)}% · {target.estimatedHours.toFixed(1)}h path
        {target.reachableBy ? ` · by ${target.reachableBy}` : ""}
      </div>

      {showRoiList ? (
        <div className="space-y-2">
          {target.rankedChapters.slice(0, roiCount).map((chapter) => (
            <div
              key={chapter.chapter}
              className="flex items-center justify-between rounded-lg bg-[#050c1c] px-2 py-1.5 text-[11px]"
            >
              <span className="truncate text-slate-200">{chapter.name}</span>
              <span className="shrink-0 text-slate-400">ROI {chapter.roi.toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="mt-1 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white"
          style={{ backgroundColor: theme.primary }}
        >
          Start: {nextAction.recommendedAction}
        </button>
      )}
    </div>
  );
}
