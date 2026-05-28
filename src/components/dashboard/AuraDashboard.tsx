import type { AuraEngineOutputs, StudentLearningProfile } from "@/types/aura-engine-contracts";
import type { AdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { HeroCommandCenter } from "@/components/dashboard/HeroCommandCenter";
import { RecoverySection } from "@/components/dashboard/RecoverySection";
import { SubjectHeatmap } from "@/components/dashboard/SubjectHeatmap";
import { TargetSection } from "@/components/dashboard/TargetSection";
import { AuraErrorBoundary } from "@/components/shared/AuraErrorBoundary";
import { BurnoutIndicator } from "@/components/shared/BurnoutIndicator";
import { RevisionSchedule } from "@/components/shared/RevisionSchedule";
import { useState } from "react";

const SUBJECT_LABEL: Record<string, string> = {
  math: "Math",
  science: "Science",
  social: "Social",
};

type LayoutDensity = AdaptiveTheme["layoutDensity"];

export type AuraDashboardProps = {
  engines: AuraEngineOutputs;
  theme: AdaptiveTheme;
  layoutDensity: LayoutDensity;
  profile: StudentLearningProfile;
  showRevisionSchedule: boolean;
};

export function AuraDashboard({
  engines,
  theme,
  layoutDensity,
  profile,
  showRevisionSchedule,
}: AuraDashboardProps) {
  const {
    projection,
    archetype,
    recovery,
    target,
    momentum,
    nextAction,
    analytics,
    burnout,
    rank,
    revision,
  } = engines;

  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});
  const [bouncing, setBouncing] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'Recovery' | 'Subjects' | 'Target'>('Recovery')

  const planTasks = (recovery?.top3 ?? []).slice(0, 3).map((item, index) => ({
    id: item.chapter,
    subject: item.subject,
    name: item.name ?? item.chapter,
    minutes: (item.sessionsNeeded ?? 0) * 20,
    reason:
      index === 0
        ? (nextAction?.rationale ?? "")
        : `${(item.recoverableMarks ?? 0).toFixed(1)} marks recoverable`,
    urgency: item.urgency ?? "medium",
  }));

  const densityGap =
    layoutDensity === "simple" ? "gap-3" : layoutDensity === "advanced" ? "gap-5" : "gap-4";

  const wrapperClass =
    layoutDensity === "simple"
      ? "density-simple flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#020817] text-slate-200"
      : "flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#020817] text-slate-200";

  return (
    <div className={wrapperClass} style={{ fontFamily: "DM Sans, sans-serif" }}>
      <header className="flex h-[50px] shrink-0 items-center justify-between border-b border-[#1a2744] px-4">
        <div className="flex items-center gap-3">
          <span
            className="aura-archetype-transition text-sm font-black tracking-tight text-slate-100"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Aura
          </span>
          <span
            className="aura-archetype-transition rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
            style={{
              color: theme.primary,
              backgroundColor: theme.dim,
              border: `1px solid ${theme.primary}44`,
            }}
          >
            {theme.badge}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{profile.student?.daysToExam ?? 0} days to exam</span>
          <span className="font-medium text-slate-200">{profile.student?.name ?? "Student"}</span>
        </div>
      </header>

      <BurnoutIndicator burnout={burnout} />

      <AuraErrorBoundary sectionName="Hero Command Center">
        <HeroCommandCenter
          projection={projection}
          nextAction={nextAction}
          dashboardTone={archetype?.dashboardTone ?? ""}
          theme={theme}
          layoutDensity={layoutDensity}
          momentum={momentum}
          rank={rank}
          archetype={archetype?.archetype ?? "average"}
        />
      </AuraErrorBoundary>

      <div className="relative flex md:hidden border-b border-border mb-2">
        {(['Recovery', 'Subjects', 'Target'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative flex-1 py-2.5 text-xs font-semibold transition-colors duration-200"
            style={{
              color: activeTab === tab ? theme.primary : "var(--muted-foreground)",
            }}
          >
            {tab}
            {activeTab === tab ? (
              <span
                className="animate-pill absolute inset-x-4 -bottom-px h-0.5 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}
          </button>
        ))}
      </div>

      <section
        className={`grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-4 pb-3 md:grid-cols-3 ${densityGap}`}
      >
        <AuraErrorBoundary sectionName="Subject Heatmap">
          <div className={`${activeTab === 'Subjects' ? 'block' : 'hidden'} md:block`}>
            <SubjectHeatmap
              projection={projection}
              profile={profile}
              analytics={analytics}
              theme={theme}
              layoutDensity={layoutDensity}
            />
          </div>
        </AuraErrorBoundary>
        <AuraErrorBoundary sectionName="Recovery Section">
          <div className={`${activeTab === 'Recovery' ? 'block' : 'hidden'} md:block`}>
            <RecoverySection recovery={recovery} theme={theme} layoutDensity={layoutDensity} />
          </div>
        </AuraErrorBoundary>
        <AuraErrorBoundary sectionName="Target Section">
          <div className={`${activeTab === 'Target' ? 'block' : 'hidden'} md:block`}>
            <TargetSection
              projection={projection}
              target={target}
              nextAction={nextAction}
              theme={theme}
              layoutDensity={layoutDensity}
            />
          </div>
        </AuraErrorBoundary>
      </section>

      <AuraErrorBoundary sectionName="Today's Plan">
        <section className="shrink-0 border-t border-[#1a2744] px-4 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Today&apos;s Plan
          </div>
          {showRevisionSchedule ? (
            <RevisionSchedule revision={revision} theme={theme} />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {planTasks.map((task) => (
                <div
                  key={task.id}
                  className="aura-task flex items-center gap-3 rounded-lg border border-[#1a2744] bg-[#080f1e] px-3 py-2"
                  data-done={doneTasks[task.id] ? "true" : "false"}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#1a2744]"
                    checked={!!doneTasks[task.id]}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDoneTasks((d) => ({ ...d, [task.id]: checked }));
                      if (checked) {
                        setBouncing((b) => ({ ...b, [task.id]: true }));
                        setTimeout(
                          () => setBouncing((b) => ({ ...b, [task.id]: false })),
                          450,
                        );
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="aura-task-label inline-block max-w-full truncate text-sm font-medium text-slate-100">
                      {task.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {SUBJECT_LABEL[task.subject] ?? task.subject} · {task.minutes} min ·{" "}
                      {task.urgency}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">{task.reason}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ${
                      bouncing[task.id] ? "aura-bounce-once" : ""
                    }`}
                  >
                    +{task.minutes} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </AuraErrorBoundary>
    </div>
  );
}
