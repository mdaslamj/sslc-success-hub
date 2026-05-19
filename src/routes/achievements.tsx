import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Trophy, Sparkles, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/widgets/stat-card";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { AchievementBadge } from "@/components/achievement-badge";
import { AchievementUnlockStack } from "@/components/achievement-unlock-toast";
import { useAchievements } from "@/hooks/use-achievements";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AchievementCategory } from "@/lib/achievements-catalog";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — VidyaPath SSLC Prep" },
      {
        name: "description",
        content:
          "Earn XP, level up, and unlock badges as you build study streaks and complete the SSLC syllabus.",
      },
    ],
  }),
  component: AchievementsPage,
});

type Filter = "all" | AchievementCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "streak", label: "Streaks" },
  { id: "chapters", label: "Chapters" },
  { id: "focus", label: "Focus" },
  { id: "hours", label: "Hours" },
  { id: "mastery", label: "Mastery" },
  { id: "consistency", label: "Consistency" },
];

function AchievementsPage() {
  const ach = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "all") return ach.all;
    return ach.all.filter((s) => s.def.category === filter);
  }, [ach.all, filter]);

  const earnedFirst = useMemo(
    () =>
      [...visible].sort((a, b) => {
        if (a.earned !== b.earned) return a.earned ? -1 : 1;
        return b.progress - a.progress;
      }),
    [visible],
  );

  const levelPct = Math.round(ach.level.progress * 100);

  return (
    <DashboardLayout title="Achievements">
      <div className="space-y-6">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand">
            <Sparkles className="h-3 w-3" />
            Gamification
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Your achievements
          </h1>
          <p className="text-sm text-muted-foreground">
            Earn XP for every focus session, chapter, and streak day. Unlock badges as you progress.
          </p>
        </header>

        {/* Level + streak summary */}
        <section className="grid gap-4 md:grid-cols-[auto,1fr,auto,auto]">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card flex items-center gap-4 animate-fade-in">
            <ProgressRing
              value={levelPct}
              size={104}
              label={`L${ach.level.level}`}
              sublabel={`${ach.level.xpIntoLevel}/${ach.level.xpForNextLevel} XP`}
            />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Total XP
              </div>
              <div className="font-display text-3xl font-bold">{ach.xp.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {ach.level.xpForNextLevel - ach.level.xpIntoLevel} XP to L{ach.level.level + 1}
              </div>
            </div>
          </div>

          <StatCard
            label="Badges earned"
            value={`${ach.earned.length} / ${ach.all.length}`}
            icon={<Trophy className="h-4 w-4" />}
            accent="brand"
            hint={ach.earned.length === 0 ? "Start a focus session to earn your first" : "Keep going"}
          />
          <StatCard
            label="Current streak"
            value={`${ach.streak.current}d`}
            icon={<Flame className="h-4 w-4" />}
            accent="warning"
            hint={`Longest ${ach.streak.longest}d`}
          />
          <StatCard
            label="Next milestone"
            value={
              ach.locked[0]
                ? `${Math.round(ach.locked[0].progress * 100)}%`
                : "All done"
            }
            icon={<Zap className="h-4 w-4" />}
            accent="info"
            hint={ach.locked[0]?.def.title ?? "Catalog cleared"}
          />
        </section>

        {/* Filters */}
        <section className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className={cn(
                "rounded-full text-xs",
                filter === f.id && "bg-foreground text-background hover:bg-foreground/90",
              )}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </section>

        {/* Grid */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {earnedFirst.map((s) => (
            <AchievementBadge key={s.def.code} status={s} />
          ))}
        </section>

        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No achievements in this category yet.
          </div>
        )}
      </div>

      <AchievementUnlockStack
        unlocks={ach.recentUnlocks}
        onDismiss={ach.acknowledgeUnlock}
      />
    </DashboardLayout>
  );
}