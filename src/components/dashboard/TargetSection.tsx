import type {
  NextActionOutput,
  ScoreProjectionOutput,
  TargetGapOutput,
} from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useEffect, useRef, useState } from "react";
import { numericFontStyle } from "@/lib/design-tokens";

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) {
      setValue(target);
      return;
    }
    startedRef.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

function CountNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const v = useCountUp(value, 1000);
  return <>{Math.round(v)}{suffix}</>;
}

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
            className="text-2xl font-black text-slate-100 tabular-nums"
            style={numericFontStyle}
          >
            <CountNumber value={projection?.percentage ?? 0} suffix="%" />
          </div>
          <div className="text-xs text-slate-400">current prediction</div>
        </div>
        <div className="text-right">
          <div
            className="aura-archetype-transition text-lg font-bold tabular-nums"
            style={{ color: theme.accent, ...numericFontStyle }}
          >
            <CountNumber value={target?.targetScore ?? 0} suffix="%" />
          </div>
          <div className="text-xs text-slate-400">target</div>
        </div>
      </div>
      <div className="mb-3 text-xs text-slate-400">
        Gap{" "}
        <span style={numericFontStyle}>{(target?.gapPercentage ?? 0).toFixed(1)}%</span>
        {" · "}
        <span style={numericFontStyle}>{(target?.estimatedHours ?? 0).toFixed(1)}h</span>
        {" path"}
        {target?.reachableBy ? ` · by ${target.reachableBy}` : ""}
      </div>

      {showRoiList ? (
        <div className="space-y-2">
          {(target?.rankedChapters ?? []).slice(0, roiCount).map((chapter) => (
            <div
              key={chapter.chapter}
              className="flex items-center justify-between rounded-lg bg-[#050c1c] px-2 py-1.5 text-[11px]"
            >
              <span className="truncate text-slate-200">{chapter.name ?? chapter.chapter}</span>
              <span className="shrink-0 text-slate-400 tabular-nums" style={numericFontStyle}>
                ROI {(chapter.roi ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="aura-archetype-transition mt-1 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white"
          style={{ backgroundColor: theme.primary }}
        >
          Start: {nextAction?.recommendedAction ?? "Review your next chapter"}
        </button>
      )}
    </div>
  );
}
