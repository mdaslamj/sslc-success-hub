import type { RankPredictionOutput } from "@/types/aura-engine-contracts";

type RankBadgeProps = {
  rank: RankPredictionOutput;
  archetype: string;
};

const RANK_COLORS: Record<RankPredictionOutput["estimatedRank"], string> = {
  "Top 1%": "#a855f7",
  "Top 5%": "#6366f1",
  "Top 10%": "#3b82f6",
  "Top 25%": "#f59e0b",
  Average: "#64748b",
};

export function RankBadge({ rank, archetype }: RankBadgeProps) {
  if (archetype !== "topper") {
    return null;
  }

  const rankColor = RANK_COLORS[rank.estimatedRank] ?? "#a855f7";

  return (
    <div className="mt-3 rounded-lg border border-[#1a2744] bg-[#050c1c] p-3">
      <div
        className="text-2xl font-black leading-none"
        style={{ color: rankColor, fontFamily: "Syne, sans-serif" }}
      >
        {rank.estimatedRank}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">State rank estimate</div>
      <div
        className="mt-2 text-xs font-medium"
        style={{ color: rank.gapToTopTen === 0 ? "#22c55e" : "#94a3b8" }}
      >
        {rank.gapToTopTen === 0
          ? "You are in the top 10%"
          : `${rank.gapToTopTen} marks to top 10%`}
      </div>
    </div>
  );
}
