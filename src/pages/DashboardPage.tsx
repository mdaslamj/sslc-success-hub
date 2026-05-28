import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AuraDashboard,
  type DashboardPlanTask,
} from "@/components/dashboard/AuraDashboard";
import AuraCausalityChain, { AuraReplanBanner } from "@/components/AuraCausalityChain";
import { buildConstellationView } from "@/core/academic-state/constellationView";
import {
  processPlannerTaskCompletion,
  type PlannerCompletionResult,
  type PlannerSubjectSeed,
} from "@/core/academic-state/plannerCompletionAdapter";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import { buildPlannerChapterPool } from "@/lib/planner-chapter-pool";
import { SSLC_SUBJECTS } from "@/data/sslc-academic-catalog";
import type { RankedPlannerTask } from "@/lib/taskPriorityEngine";

const placeholderStyle = {
  height: "160px",
  width: "100%",
  background: "var(--color-background-secondary)",
  borderRadius: "var(--border-radius-lg)",
} as const;

function AuraDashboardSkeleton() {
  return (
    <div
      className="flex min-h-full flex-col gap-3 bg-[#020817] p-4 pb-[max(120px,env(safe-area-inset-bottom))]"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div style={placeholderStyle} />
      <div style={placeholderStyle} />
      <div style={placeholderStyle} />
    </div>
  );
}

function buildPlannerSubjects(
  constellationSubjects: ReturnType<typeof buildConstellationView>["subjects"],
): PlannerSubjectSeed[] {
  return SSLC_SUBJECTS.map((subject) => {
    const view = constellationSubjects[subject.id];
    return {
      id: subject.id,
      name: subject.name,
      color: view?.color ?? subject.color,
      target: view?.target ?? subject.target,
      predicted: view?.predicted ?? subject.predicted,
      mastery: view?.mastery ?? subject.mastery,
    };
  });
}

function buildRankedTaskFromDashboardTask(
  task: DashboardPlanTask,
  chapterPool: ReturnType<typeof buildPlannerChapterPool>,
): RankedPlannerTask {
  const normalizedId = task.id.replace(/_/g, "-");
  const poolChapter =
    chapterPool.find((chapter) => chapter.id === task.id) ??
    chapterPool.find((chapter) => chapter.id === normalizedId) ??
    chapterPool.find((chapter) => chapter.title === task.name);

  const subjectSeed = SSLC_SUBJECTS.find((subject) => subject.id === task.subject);
  const subjectName = subjectSeed?.name ?? task.subject;
  const mastery = poolChapter?.mastery ?? 50;
  const taskLabel =
    mastery < 50
      ? `Recover — ${task.name}`
      : mastery < 70
        ? `Practice — ${task.name}`
        : `Revise — ${task.name}`;

  const chapter = poolChapter
    ? {
        ...poolChapter,
        subjectName,
        whyText: task.reason,
        priorityScore: 0,
      }
    : {
        id: task.id,
        title: task.name,
        subjectId: task.subject,
        mastery,
        subjectName,
        whyText: task.reason,
        priorityScore: 0,
      };

  return {
    id: 1,
    subject: subjectName,
    subjectId: task.subject,
    task: taskLabel,
    title: task.name,
    time: `${task.minutes} min`,
    durationMin: task.minutes,
    done: false,
    whyText: task.reason,
    subjectColor: subjectSeed?.color ?? "#6366f1",
    priorityScore: 0,
    chapter,
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    profile,
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
    isLoading,
    updateMastery,
    appendSession,
  } = useAuraEngines();
  const theme = useAdaptiveTheme(archetype?.archetype ?? "average");

  const [lastResult, setLastResult] = useState<PlannerCompletionResult | null>(null);
  const [showChain, setShowChain] = useState(false);
  const [replanMessage, setReplanMessage] = useState("");
  const [showReplanBanner, setShowReplanBanner] = useState(false);

  const constellation = useMemo(
    () => buildConstellationView(profile, projection),
    [profile, projection],
  );
  const plannerSubjects = useMemo(
    () => buildPlannerSubjects(constellation.subjects),
    [constellation.subjects],
  );
  const chapterPool = useMemo(() => buildPlannerChapterPool(), []);

  const showRevisionSchedule = useMemo(
    () =>
      (revision?.schedule ?? []).filter((item) => item.priority === "urgent").length >= 2,
    [revision?.schedule],
  );

  const engineOutputs = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const handleTaskComplete = useCallback(
    async (task: DashboardPlanTask) => {
      const burnoutScore = Math.round(burnout?.score ?? 0);
      const rankedTask = buildRankedTaskFromDashboardTask(task, chapterPool);
      const result = processPlannerTaskCompletion(
        rankedTask,
        profile,
        plannerSubjects,
        chapterPool,
        burnoutScore,
        burnout,
      );

      if (!result) return;

      updateMastery(
        result.engineSubject,
        result.profileChapterKey,
        result.newChapterMastery,
      );
      appendSession(result.sessionInput);
      setLastResult(result);
      setShowChain(true);

      if (result.completion.needsReplan) {
        setReplanMessage(
          result.replanSummary ?? result.causalityChain.summary ?? "Plan rebalanced",
        );
        setShowReplanBanner(true);
      }
    },
    [
      appendSession,
      burnout,
      chapterPool,
      plannerSubjects,
      profile,
      updateMastery,
    ],
  );

  if (isLoading) {
    return <AuraDashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {showReplanBanner && replanMessage ? (
        <AuraReplanBanner
          message={replanMessage}
          onViewChanges={() => navigate({ to: "/planner" })}
          onDismiss={() => {
            setShowReplanBanner(false);
            setReplanMessage("");
          }}
        />
      ) : null}

      {showChain && lastResult?.causalityChain ? (
        <div className="px-4">
          <AuraCausalityChain
            chain={lastResult.causalityChain}
            onDismiss={() => {
              setShowChain(false);
              setLastResult(null);
            }}
          />
        </div>
      ) : null}

      <AuraDashboard
        engines={engineOutputs}
        theme={theme}
        layoutDensity={theme.layoutDensity}
        profile={profile}
        showRevisionSchedule={showRevisionSchedule}
        onTaskComplete={handleTaskComplete}
      />
    </div>
  );
}
