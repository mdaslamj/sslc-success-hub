import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PlannerOnboardingPrompt } from "@/components/empty-states/NewStudentPrompts";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "@tanstack/react-router";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  CalendarClock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Trophy,
  CheckCircle2,
  Sparkles,
  Coffee,
  Brain,
  Clock,
  Star,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { subjects } from "@/lib/mock-data";
import { rankChaptersForToday, rankChaptersForTodaySync, type RankedPlannerTask } from "@/lib/taskPriorityEngine";
import {
  appendOverrideEntry,
  consumeDeferredTasks,
  countChapterPushOverrides,
  deferTaskSnapshot,
  findSwapReplacement,
  getAvoidanceCoachMessage,
  getChapterCriticalInfo,
  getDueDeferredTasks,
  snapshotToRankedTask,
  taskToDeferredSnapshot,
  tomorrowIso,
} from "@/lib/planner-overrides";
import {
  TaskOverrideBar,
  type CustomTaskInput,
} from "@/components/planner/TaskOverrideBar";
import { useCriticalChapterGuard } from "@/components/planner/CriticalChapterGuard";
import { buildPlannerChapterPool } from "@/lib/planner-chapter-pool";
import { toast } from "sonner";
import { RevisionPlannerCard, type RevisionPick } from "@/components/revision-planner-card";
import { useAnalytics } from "@/hooks/use-analytics";
import { getPrepModes, type PrepMode } from "@/lib/prep-modes";
import { canonicalSubjectRouteId } from "@/lib/chapter-routes";
import { PlannerCalendar } from "@/components/planner/planner-calendar";
import { AdaptiveGuidanceCard } from "@/components/planner/adaptive-guidance-card";
import type { AdaptivePlanItem } from "@/lib/adaptivePlannerBridge";
import {
  addEvent as addCalendarEvent,
  toDateKey,
} from "@/lib/planner-events-store";
import { AuraExecutionSystem } from "@/components/AuraExecutionSystem";
import AuraCausalityChain from "@/components/AuraCausalityChain";
import { useAcademicExecution } from "@/core/academic-state/useAcademicExecution";
import { processPlannerTaskCompletion } from "@/core/academic-state/plannerCompletionAdapter";
import { mapTaskSubjectToEngine } from "@/core/academic-state/executionEngine";
import type { CausalityChain } from "@/core/academic-state/masteryEngine";
import { resolveProfileChapterKey } from "@/lib/chapter-profile-key";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import {
  PLANNER_STORE_UPDATED_EVENT,
  type PlannerStoreUpdatedDetail,
} from "@/lib/today-plan-store";
import { flushOfflineQueue } from "@/lib/offlineQueue";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  effectiveTaskLimit,
  getTodayAvailability,
} from "@/lib/availabilityEngine";
import type { WeeklySchedule } from "@/types/aura-engine-contracts";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Aura — Study Planner" },
      {
        name: "description",
        content:
          "Plan today's SSLC study schedule, run a focus timer, and unlock achievements as you complete tasks.",
      },
    ],
  }),
  component: PlannerPage,
});

type Task = RankedPlannerTask & {
  /** Optional external link (e.g. KTBS textbook PDF). */
  link?: string;
  carriedForward?: boolean;
};

const STORAGE = "vidyapath.planner.v1";

const plannerSubjects = subjects.map((s) => ({
  id: s.id,
  name: s.name,
  color: s.color,
  target: s.target,
  predicted: s.predicted,
  mastery: s.mastery,
  emoji: s.emoji,
}));

const seedTasks: Task[] = rankChaptersForTodaySync(
  buildPlannerChapterPool(),
  plannerSubjects,
  4,
);

function createManualTask(input: {
  id: number;
  subjectName: string;
  task: string;
  durationMin: number;
  link?: string;
}): Task {
  const subj =
    subjects.find((s) => s.name === input.subjectName) ??
    subjects.find((s) => input.subjectName.startsWith(s.name)) ??
    subjects[0];
  return {
    id: input.id,
    subject: input.subjectName,
    subjectId: subj.id,
    task: input.task,
    title: input.task.replace(/^(Recover|Practice|Revise|Focus|Quick review) — /, ""),
    time: `${input.durationMin} min`,
    durationMin: input.durationMin,
    done: false,
    whyText: "",
    subjectColor: subj.color,
    priorityScore: 0,
    chapter: {
      id: `manual-${input.id}`,
      title: input.task,
      subjectId: subj.id,
      mastery: subj.mastery,
      subjectName: subj.name,
      whyText: "",
      priorityScore: 0,
    },
    link: input.link,
  };
}

function createCustomTask(input: {
  id: number;
  subjectName: string;
  chapterName: string;
  durationMin: number;
}): Task {
  const label = `Practice — ${input.chapterName}`;
  const task = createManualTask({
    id: input.id,
    subjectName: input.subjectName,
    task: label,
    durationMin: input.durationMin,
  });
  return {
    ...task,
    chapter: {
      ...task.chapter,
      id: `custom-${input.id}`,
      title: input.chapterName,
    },
  };
}

function subjectRouteIdFromTaskName(subjectName: string): string {
  const subj =
    subjects.find(
      (s) =>
        s.name.toLowerCase().startsWith(subjectName.toLowerCase()) ||
        subjectName.toLowerCase().startsWith(s.name.toLowerCase().slice(0, 4)),
    ) ?? subjects[0];
  return canonicalSubjectRouteId(subj.id);
}

function prepModeHref(subjectName: string, mode: PrepMode): string {
  if (mode.to) return mode.to;
  const subjectRoute = `/subjects/${subjectRouteIdFromTaskName(subjectName)}`;
  switch (mode.id) {
    case "formula":
    case "concept":
    case "diagram":
    case "label":
    case "experiment":
    case "map":
    case "timeline":
    case "grammar":
    case "reading":
    case "vocab":
      return subjectRoute;
    case "timed":
      return "/focus";
    case "pyq":
      return "/exams";
    default:
      return "/practice";
  }
}

async function replanIncompleteTasks(currentTasks: Task[], maxTasks: number): Promise<Task[]> {
  const done = currentTasks.filter((t) => t.done);
  if (maxTasks === 0) return done;

  const doneChapterIds = new Set(done.map((t) => t.chapter.id));
  const openSlots = Math.max(1, Math.min(maxTasks, currentTasks.length - done.length));
  let nextId = Math.max(0, ...currentTasks.map((t) => t.id)) + 1;

  const fresh = (await rankChaptersForToday(buildPlannerChapterPool(), plannerSubjects, openSlots + done.length))
    .filter((t) => !doneChapterIds.has(t.chapter.id))
    .slice(0, openSlots)
    .map((t) => ({ ...t, id: nextId++, done: false }));

  return [...done, ...fresh];
}

function replanIncompleteTasksSync(currentTasks: Task[], maxTasks: number): Task[] {
  const done = currentTasks.filter((t) => t.done);
  if (maxTasks === 0) return done;

  const doneChapterIds = new Set(done.map((t) => t.chapter.id));
  const openSlots = Math.max(1, Math.min(maxTasks, currentTasks.length - done.length));
  let nextId = Math.max(0, ...currentTasks.map((t) => t.id)) + 1;

  const fresh = rankChaptersForTodaySync(buildPlannerChapterPool(), plannerSubjects, openSlots + done.length)
    .filter((t) => !doneChapterIds.has(t.chapter.id))
    .slice(0, openSlots)
    .map((t) => ({ ...t, id: nextId++, done: false }));

  return [...done, ...fresh];
}

const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";

function hasCompletedOnboarding(
  authProfile: { onboardingCompletedAt?: number } | null | undefined,
): boolean {
  if (authProfile?.onboardingCompletedAt) return true;
  if (typeof localStorage !== "undefined" && localStorage.getItem(GUEST_ONBOARDING_KEY)) {
    return true;
  }
  return false;
}

function PlannerPage() {
  const { profile: authProfile } = useAuth();
  const { logSession } = useAnalytics();
  const { profile, updateMastery, appendSession, updateProfile, burnout } = useAuraEngines();
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [newTask, setNewTask] = useState("");
  const [newSubject, setNewSubject] = useState(subjects[0].name);
  const [newDuration, setNewDuration] = useState(30);
  const [focusMinutes, setFocusMinutes] = useState(0); // total minutes focused today
  const [hydrated, setHydrated] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [customFormTaskId, setCustomFormTaskId] = useState<number | null>(null);
  const { showCriticalGuard, showHardBlock, dialog: criticalGuardDialog } =
    useCriticalChapterGuard();
  const deferredAppliedRef = useRef(false);
  const [causalityChain, setCausalityChain] = useState<CausalityChain | null>(null);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  const schedule = useMemo<WeeklySchedule>(
    () => profile.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE,
    [profile.weeklySchedule],
  );
  const todayPlan = useMemo(() => getTodayAvailability(schedule), [schedule]);
  const taskLimit = useMemo(() => effectiveTaskLimit(todayPlan), [todayPlan]);

  const visibleTasks = useMemo(() => {
    if (todayPlan.isUnavailable) {
      return tasks.filter((t) => t.done);
    }
    const done = tasks.filter((t) => t.done);
    const pending = tasks.filter((t) => !t.done).slice(0, Math.max(1, taskLimit));
    return [...done, ...pending];
  }, [tasks, todayPlan.isUnavailable, taskLimit]);

  useEffect(() => {
    if (isOnline) void flushOfflineQueue();
  }, [isOnline]);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      void flushOfflineQueue();
    };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // Clear the "just added" highlight after a short beat.
  useEffect(() => {
    if (highlightId == null) return;
    const t = setTimeout(() => setHighlightId(null), 2200);
    return () => clearTimeout(t);
  }, [highlightId]);

  // Hydrate from localStorage first — instant, no network.
  useEffect(() => {
    const limit = effectiveTaskLimit(getTodayAvailability(schedule));

    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.tasks)) {
          setTasks(replanIncompleteTasksSync(parsed.tasks, limit));
        }
        if (typeof parsed.focusMinutes === "number") {
          setFocusMinutes(parsed.focusMinutes);
        }
      } else if (limit > 0) {
        setTasks(
          rankChaptersForTodaySync(buildPlannerChapterPool(), plannerSubjects, limit),
        );
      } else {
        setTasks([]);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);

    // Enrich WHY texts from Firestore when online (non-blocking).
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void (async () => {
        try {
          const raw = localStorage.getItem(STORAGE);
          if (!raw) {
            if (limit <= 0) return;
            const fresh = await rankChaptersForToday(
              buildPlannerChapterPool(),
              plannerSubjects,
              limit,
            );
            setTasks(fresh);
            return;
          }
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.tasks)) {
            const enriched = await replanIncompleteTasks(parsed.tasks, limit);
            setTasks(enriched);
          }
        } catch {
          /* cached tasks remain usable offline */
        }
      })();
    }
  }, [schedule]);

  // Prepend deferred tasks due today (carried forward from push).
  useEffect(() => {
    if (!hydrated || deferredAppliedRef.current) return;
    const due = getDueDeferredTasks(profile);
    if (due.length === 0) return;

    deferredAppliedRef.current = true;
    const chapterIds = due.map((d) => d.snapshot.chapter.id);

    setTasks((prev) => {
      const existing = new Set(prev.map((t) => t.chapter.id));
      let nextId = Math.max(0, ...prev.map((t) => t.id));
      const prepend = due
        .filter((d) => !existing.has(d.snapshot.chapter.id))
        .map((d) => ({
          ...snapshotToRankedTask(d.snapshot, ++nextId, { carriedForward: true }),
          carriedForward: true,
        }));

      if (prepend.length === 0) return prev;
      return [...prepend, ...prev];
    });

    updateProfile({
      deferredTasks: consumeDeferredTasks(profile, chapterIds),
    });
  }, [hydrated, profile, updateProfile]);

  // Live sync when War Room / Textbooks append via today-plan-store
  useEffect(() => {
    const handleExternalAdd = (event: Event) => {
      const incoming = (event as CustomEvent<PlannerStoreUpdatedDetail>).detail?.tasks;
      if (!Array.isArray(incoming)) return;
      setTasks(incoming);
    };
    window.addEventListener(PLANNER_STORE_UPDATED_EVENT, handleExternalAdd);
    return () => window.removeEventListener(PLANNER_STORE_UPDATED_EVENT, handleExternalAdd);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE, JSON.stringify({ tasks, focusMinutes }));
  }, [tasks, focusMinutes, hydrated]);

  const doneCount = visibleTasks.filter((t) => t.done).length;
  const totalMin = visibleTasks.reduce((a, t) => a + t.durationMin, 0);
  const doneMin = visibleTasks.filter((t) => t.done).reduce((a, t) => a + t.durationMin, 0);
  const completionPct = visibleTasks.length
    ? Math.round((doneCount / visibleTasks.length) * 100)
    : 0;

  function toggleTask(id: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const markingDone = !task.done;

    if (markingDone) {
      const burnoutScore = Math.round(burnout?.score ?? 0);
      const result = processPlannerTaskCompletion(
        task,
        profile,
        plannerSubjects,
        buildPlannerChapterPool(),
        burnoutScore,
        burnout,
      );

      if (result) {
        updateMastery(
          result.engineSubject,
          result.profileChapterKey,
          result.newChapterMastery,
        );
        appendSession(result.sessionInput);
        setCausalityChain(result.causalityChain);

        toast.success("Task completed", {
          description: result.causalityChain.summary,
          icon: <CheckCircle2 className="h-4 w-4" />,
        });

        if (result.completion.needsReplan) {
          setTasks((prev) => {
            const next = prev.map((t) => (t.id === id ? { ...t, done: true } : t));
            if (typeof navigator !== "undefined" && navigator.onLine) {
              void replanIncompleteTasks(next, taskLimit).then(setTasks);
              return next;
            }
            return replanIncompleteTasksSync(next, taskLimit);
          });
          toast.info("Plan rebalanced", {
            description: result.replanSummary ?? "Aura adjusted remaining tasks for today.",
          });
          return;
        }
      } else {
        toast.success("Task completed", {
          description: `${task.subject} · ${task.task}`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  function addTask() {
    if (!newTask.trim()) return;
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [
      ...prev,
      createManualTask({
        id,
        subjectName: newSubject,
        task: newTask.trim(),
        durationMin: newDuration,
      }),
    ]);
    setNewTask("");
    setHighlightId(id);
    toast("Task added to today's plan");
  }

  function removeTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function executeSwap(task: Task) {
    const replacement = findSwapReplacement(
      tasks,
      buildPlannerChapterPool(),
      plannerSubjects,
      task.chapter.id,
    );
    if (!replacement) {
      toast.error("No other chapters available to swap in");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...replacement, id: t.id, done: false } : t)),
    );
    updateProfile({
      overrideHistory: appendOverrideEntry(profile, {
        type: "swap",
        chapterId: task.chapter.id,
      }),
    });
    toast.success("Task swapped", { description: replacement.task });
  }

  function executePush(task: Task) {
    const snapshot = taskToDeferredSnapshot(task);
    updateProfile({
      overrideHistory: appendOverrideEntry(profile, {
        type: "push",
        chapterId: task.chapter.id,
      }),
      deferredTasks: deferTaskSnapshot(profile, snapshot, tomorrowIso()),
    });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    toast.success("Moved to tomorrow", { description: task.title });
  }

  async function requestSwap(task: Task) {
    if (task.done || todayPlan.isUnavailable) return;
    const { critical, marksAtRisk, title } = getChapterCriticalInfo(task, plannerSubjects);
    if (critical) {
      const confirmed = await showCriticalGuard({
        chapterName: title,
        marksAtRisk,
        action: "swap",
      });
      if (!confirmed) return;
    }
    executeSwap(task);
  }

  async function requestPush(task: Task) {
    if (task.done || todayPlan.isUnavailable) return;
    const pushCount = countChapterPushOverrides(profile.overrideHistory, task.chapter.id);
    const { critical, marksAtRisk, title } = getChapterCriticalInfo(task, plannerSubjects);

    if (pushCount >= 2) {
      const outcome = await showHardBlock({
        chapterName: title,
        pushCount: pushCount + 1,
        marksAtRisk,
      });
      if (outcome === "study") {
        setExpandedTaskId(task.id);
      }
      return;
    }

    if (critical && pushCount >= 1) {
      const confirmed = await showCriticalGuard({
        chapterName: title,
        marksAtRisk,
        action: "push",
        pushCount,
      });
      if (!confirmed) {
        setExpandedTaskId(task.id);
        return;
      }
    }

    executePush(task);
  }

  function saveCustomTask(afterTaskId: number, input: CustomTaskInput) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const custom = createCustomTask({ id, ...input });
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === afterTaskId);
      if (idx === -1) return [...prev, custom];
      const next = [...prev];
      next.splice(idx + 1, 0, custom);
      return next;
    });
    setCustomFormTaskId(null);
    setHighlightId(id);
    toast.success("Custom task added");
  }

  function addFromRecommendation(pick: RevisionPick) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [
      ...prev,
      createManualTask({
        id,
        subjectName: pick.subjectName,
        task: `Revise — ${pick.topic}`,
        durationMin: pick.minutes,
      }),
    ]);
    setHighlightId(id);
    toast.success("Added to today's plan", {
      description: `${pick.subjectName} · ${pick.minutes} min`,
    });
  }

  /**
   * Add an adaptive guidance item (daily focus / revision / recovery /
   * practice) to today's plan. Keeps planner as single source of truth
   * and prevents duplicate entries with the same title.
   */
  function addAdaptiveItem(item: AdaptivePlanItem) {
    const subjectMatch =
      subjects.find((s) => s.id === item.subjectId) ??
      subjects.find((s) => s.name.toLowerCase().includes(item.subjectId.toLowerCase())) ??
      subjects[0];
    const prefix =
      item.kind === "practice"
        ? "Practice"
        : item.kind === "recovery"
        ? "Recover"
        : item.kind === "daily-focus"
        ? "Focus"
        : "Revise";
    const taskTitle = `${prefix} — ${item.title}`;
    if (tasks.some((t) => t.task.toLowerCase() === taskTitle.toLowerCase())) {
      toast("Already on today's plan");
      return;
    }
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [
      ...prev,
      createManualTask({
        id,
        subjectName: subjectMatch.name,
        task: taskTitle,
        durationMin: item.minutes,
      }),
    ]);
    setHighlightId(id);
    toast.success("Added to today's plan", {
      description: `${subjectMatch.name} · ${item.minutes} min`,
      icon: <Sparkles className="h-4 w-4" />,
    });
  }

  /**
   * A prep-mode click should *do* something: schedule a focused study session
   * for that mode into today's plan, mirror it into the calendar so the daily
   * balance reflects it, and gently confirm with a highlight pulse.
   */
  function addPrepModeSession(parent: Task, mode: { id: string; label: string }) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const durationMin = 25;
    const title = `${mode.label} — ${parent.task}`;
    setTasks((prev) => [
      ...prev,
      createManualTask({
        id,
        subjectName: parent.subject,
        task: title,
        durationMin,
      }),
    ]);
    try {
      addCalendarEvent({
        title,
        category: mode.id === "pyq" || mode.id === "timed" ? "mock-exam" : "study",
        date: toDateKey(new Date()),
        durationMin,
        subject: parent.subject,
      });
    } catch {
      /* localStorage unavailable — task still added */
    }
    setHighlightId(id);
    toast.success(`${mode.label} scheduled`, {
      description: `${parent.subject} · ${durationMin} min today`,
      icon: <Sparkles className="h-4 w-4" />,
    });
  }

  /* ----- Academic continuity signals (lightweight, derived only) ----- */
  const pendingCount = visibleTasks.length - doneCount;
  const nextUp = useMemo(() => visibleTasks.find((t) => !t.done) ?? null, [visibleTasks]);
  const overloadHint = visibleTasks.length >= 8;
  const underloadHint = visibleTasks.length > 0 && visibleTasks.length <= 2;
  const emotional = useMemo(() => {
    try {
      const { getEmotionalSummary } = require("@/lib/emotionalProgress");
      return getEmotionalSummary();
    } catch {
      return null;
    }
  }, [tasks, doneCount, focusMinutes]);

  const avoidanceCoach = useMemo(
    () => getAvoidanceCoachMessage(profile),
    [profile.overrideHistory, profile.deferredTasks],
  );

  const mentorMessage = useMemo(() => {
    if (avoidanceCoach) return avoidanceCoach;

    // Prefer emotional signal when learning data exists, else fall back to
    // task-completion coaching.
    if (emotional && (doneCount > 0 || visibleTasks.length === 0)) {
      // Blend emotional headline with a gentle task hint.
      if (visibleTasks.length === 0)
        return `${emotional.headline} ${emotional.consistency}`;
      if (doneCount === visibleTasks.length)
        return `${emotional.headline} ${emotional.progress}`;
      if (completionPct >= 50)
        return `${emotional.confidence} You're past halfway — finish the next task before the energy dips.`;
      if (focusMinutes === 0 && doneCount === 0)
        return `${emotional.headline} A 25-min sprint on the first task will unlock the day.`;
      return `${emotional.headline} ${emotional.recovery || emotional.consistency}`;
    }
    if (visibleTasks.length === 0)
      return todayPlan.isUnavailable
        ? "Rest day — recharge so tomorrow's session hits harder."
        : "Plan one thing — even 25 minutes of focus today builds momentum.";
    if (doneCount === visibleTasks.length)
      return "Every task done. Protect this rhythm — schedule tomorrow now.";
    if (overloadHint && doneCount === 0)
      return "Heavy day ahead. Start with the smallest task to build flow.";
    if (completionPct >= 50)
      return "You're past halfway — finish the next task before the energy dips.";
    if (underloadHint)
      return "Light plan today — perfect window to revise a weak topic.";
    if (focusMinutes === 0 && doneCount === 0)
      return "No focus logged yet. A 25-min sprint on the first task will unlock the day.";
    return "Keep the rhythm — one task, then a short break.";
  }, [visibleTasks.length, doneCount, completionPct, overloadHint, underloadHint, focusMinutes, emotional, todayPlan.isUnavailable, avoidanceCoach]);

  // Achievements (live)
  const unlocked = useMemo(() => {
    const list: { id: string; icon: string; label: string; desc: string; earned: boolean }[] = [
      {
        id: "first-task",
        icon: "✅",
        label: "First task done",
        desc: "Complete 1 task today",
        earned: doneCount >= 1,
      },
      {
        id: "half-day",
        icon: "🌤️",
        label: "Half-day hero",
        desc: "Finish 50% of today's plan",
        earned: completionPct >= 50,
      },
      {
        id: "all-done",
        icon: "🏆",
        label: "Plan crusher",
        desc: "Complete all today's tasks",
        earned: visibleTasks.length > 0 && doneCount === visibleTasks.length,
      },
      {
        id: "deep-focus",
        icon: "🧠",
        label: "Deep focus",
        desc: "Focus for 25 minutes",
        earned: focusMinutes >= 25,
      },
      {
        id: "marathon",
        icon: "🔥",
        label: "Study marathon",
        desc: "Focus for 90 minutes today",
        earned: focusMinutes >= 90,
      },
      {
        id: "balanced",
        icon: "⚖️",
        label: "Balanced day",
        desc: "Complete tasks in 3+ subjects",
        earned:
          new Set(visibleTasks.filter((t) => t.done).map((t) => t.subject)).size >= 3,
      },
    ];
    return list;
  }, [doneCount, completionPct, visibleTasks, focusMinutes]);

  const earnedCount = unlocked.filter((a) => a.earned).length;

  const plannerTaskSnapshots = useMemo(
    () =>
      visibleTasks.map((t) => ({
        id: t.id,
        subject: t.subject,
        task: t.task,
        durationMin: t.durationMin,
        done: t.done,
      })),
    [visibleTasks],
  );

  const { snapshot: executionSnapshot } = useAcademicExecution({
    tasks: plannerTaskSnapshots,
  });

  if (!hasCompletedOnboarding(authProfile)) {
    return (
      <DashboardLayout title="Study Planner">
        <div className="mx-auto w-full max-w-7xl">
          <PlannerOnboardingPrompt />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Study Planner">
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-clip">
        {!isOnline && (
          <div
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-200"
          >
            Offline — progress saves when you reconnect
          </div>
        )}

        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Today's Plan
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight break-words">
              Plan. <span className="gradient-text">Focus.</span> Win the day.
            </h1>
            <p className="text-sm text-muted-foreground">
              Adaptive schedule with built-in Pomodoro and live achievements.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <StatPill icon={<CheckCircle2 className="h-4 w-4" />} label="Done" value={`${doneCount}/${visibleTasks.length}`} />
            <StatPill icon={<Clock className="h-4 w-4" />} label="Focused" value={`${focusMinutes}m`} />
            <StatPill icon={<Trophy className="h-4 w-4" />} label="Badges" value={`${earnedCount}/${unlocked.length}`} />
          </div>
        </header>

        {causalityChain && (
          <AuraCausalityChain
            chain={causalityChain}
            onDismiss={() => setCausalityChain(null)}
          />
        )}

        <AuraExecutionSystem snapshot={executionSnapshot} />

        {/* Day progress bar */}
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          {todayPlan.isUnavailable ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <Coffee className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">Rest day</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No study scheduled today — you marked this day unavailable. Come back tomorrow.
                </p>
              </div>
            </div>
          ) : (
            <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Daily progress</span>
            <span className="text-muted-foreground">
              {doneMin} of {totalMin} planned min · {completionPct}%
            </span>
          </div>
          <Progress value={completionPct} className="mt-3" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {todayPlan.availableMinutes} min available today · up to {taskLimit} task
            {taskLimit === 1 ? "" : "s"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {pendingCount} pending
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {doneCount} done
            </span>
            {nextUp && (
              <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-brand/30 bg-brand/5 px-2 py-1 text-brand">
                <Sparkles className="h-3 w-3" />
                <span className="truncate max-w-[180px] sm:max-w-xs">
                  Next: {nextUp.task}
                </span>
              </span>
            )}
          </div>
          {/* Mentor strip — supportive, concise, never chatty. */}
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3 text-xs text-foreground/90">
            <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <p className="leading-snug">{mentorMessage}</p>
          </div>
            </>
          )}
        </section>

        {/* Calendar & life-planning layer */}
        <PlannerCalendar />

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* LEFT: schedule */}
          <section className="min-w-0 rounded-3xl border border-border/60 bg-card p-4 shadow-card sm:p-6">
            <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold">
                <Sparkles className="h-4 w-4 text-brand" /> Today's Schedule
              </h3>
              <Badge variant="outline" className="rounded-full">
                {visibleTasks.length} tasks
              </Badge>
            </div>

            <div className="space-y-2">
              {visibleTasks.map((t) => {
                const subj = subjects.find((s) => s.name.startsWith(t.subject)) ?? subjects[0];
                const prepModes = getPrepModes(t.subject);
                return (
                  <Collapsible
                    key={t.id}
                    open={expandedTaskId === t.id}
                    onOpenChange={(open) => setExpandedTaskId(open ? t.id : null)}
                    className={`group rounded-2xl border transition ${
                      highlightId === t.id ? "ring-2 ring-brand/50 animate-pulse" : ""
                    } ${
                      t.done
                        ? "border-success/30 bg-success/5"
                        : "border-border/60 bg-background/40 hover:border-brand/40"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2 p-3 sm:items-center sm:gap-3">
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={() => toggleTask(t.id)}
                      className="h-5 w-5"
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setExpandedTaskId((current) => (current === t.id ? null : t.id))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedTaskId((current) => (current === t.id ? null : t.id));
                        }
                      }}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-base font-bold"
                      style={{
                        background: `color-mix(in oklab, ${subj.color} 18%, transparent)`,
                        color: subj.color,
                      }}
                      aria-label={`Toggle preparation modes for ${t.task}`}
                    >
                      {subj.emoji}
                    </div>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left [&[data-state=open]_.prep-chev]:rotate-180"
                        aria-label="Show preparation modes"
                      >
                      <div
                        className={`truncate text-sm font-medium ${
                          t.done ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {t.task}
                      </div>
                      {t.whyText && (
                        <div
                          className="mt-1 rounded-md px-2 py-1 text-[10px] leading-snug"
                          style={{
                            color: t.subjectColor,
                            backgroundColor: `color-mix(in oklab, ${t.subjectColor} 14%, transparent)`,
                          }}
                        >
                          {t.whyText}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {t.subject} · {t.time}
                        </span>
                        {t.carriedForward && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Carried forward
                          </span>
                        )}
                        {t.link && (
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand hover:bg-brand/20"
                          >
                            📘 Open <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 [&[data-state=open]_svg]:rotate-180"
                        aria-label="Toggle preparation modes"
                      >
                        <ChevronDown className="prep-chev h-4 w-4 transition-transform" />
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => removeTask(t.id)}
                      aria-label="Remove task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    </div>
                    <CollapsiblePanel>
                      <div className="space-y-3 border-t border-border/60 px-3 py-3">
                        {!t.done && !todayPlan.isUnavailable && (
                          <TaskOverrideBar
                            disabled={t.done}
                            showCustomForm={customFormTaskId === t.id}
                            onSwap={() => void requestSwap(t)}
                            onPush={() => void requestPush(t)}
                            onToggleCustomForm={() =>
                              setCustomFormTaskId((current) => (current === t.id ? null : t.id))
                            }
                            onSaveCustom={(input) => saveCustomTask(t.id, input)}
                          />
                        )}
                        <div>
                        <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                          Preparation modes
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {prepModes.map((m) => {
                            const inner = (
                              <>
                                <span className="text-base leading-none">{m.icon}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium">
                                    {m.label}
                                  </span>
                                  <span className="block truncate text-[10px] text-muted-foreground">
                                    {m.hint}
                                  </span>
                                </span>
                              </>
                            );
                            const cls =
                              "flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-2 text-left transition hover:border-brand/40 hover:bg-brand/5";
                            const href = prepModeHref(t.subject, m);
                            return (
                              <Link
                                key={m.id}
                                to={href}
                                className={cls}
                                onClick={() => setExpandedTaskId(null)}
                              >
                                {inner}
                              </Link>
                            );
                          })}
                        </div>
                        </div>
                      </div>
                    </CollapsiblePanel>
                  </Collapsible>
                );
              })}
              {visibleTasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground sm:p-8">
                  {todayPlan.isUnavailable
                    ? "Rest day — no tasks scheduled. Enjoy the break."
                    : "No tasks left. Add one below to keep momentum going."}
                </div>
              )}
            </div>

            {/* Add task */}
            <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-3 min-w-0">
              <div className="grid gap-2 sm:grid-cols-[1fr_140px_90px_auto]">
                <Input
                  placeholder="New task — e.g. Revise Trigonometry"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
                <select
                  className="rounded-md border border-input bg-background px-3 text-sm"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.emoji} {s.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value) || 30)}
                />
                <Button onClick={addTask} className="rounded-full">
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </section>

          {/* RIGHT: focus + achievements */}
          <section className="min-w-0 space-y-6">
            <AdaptiveGuidanceCard onAdd={addAdaptiveItem} />
            <RevisionPlannerCard onAddToPlan={addFromRecommendation} />
            <FocusTimer
              onSessionComplete={(min) => {
                setFocusMinutes((m) => m + min);
                logSession({
                  kind: "focus",
                  startedAt: Date.now() - min * 60 * 1000,
                  endedAt: Date.now(),
                  durationMinutes: min,
                });

                const currentTask = tasks.find((t) => !t.done);
                const engineSubject = currentTask
                  ? mapTaskSubjectToEngine(currentTask.subjectId)
                  : null;
                const chapterKey =
                  currentTask && engineSubject
                    ? resolveProfileChapterKey(profile, engineSubject, currentTask.chapter)
                    : "focus-session";

                appendSession({
                  date: new Date().toISOString().split("T")[0],
                  subject: engineSubject,
                  chapter: chapterKey,
                  durationMinutes: min,
                  questionsAttempted: 0,
                  questionsCorrect: 0,
                  score: null,
                  hintsUsed: 0,
                  retriesOnWrong: 0,
                  completedPlan: true,
                  panicSignal: false,
                  engineType: "adaptive",
                });
              }}
            />

            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" /> Achievements
                </h3>
                <Badge variant="outline" className="rounded-full">
                  {earnedCount}/{unlocked.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {unlocked.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-2xl border p-3 transition ${
                      a.earned
                        ? "border-warning/30 bg-warning/5 shadow-card"
                        : "border-border/60 bg-background/30 opacity-60"
                    }`}
                  >
                    <div className="text-2xl">{a.icon}</div>
                    <div className="mt-1 text-xs font-semibold">{a.label}</div>
                    <div className="text-[10px] text-muted-foreground">{a.desc}</div>
                    {a.earned && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-warning">
                        <Star className="h-3 w-3 fill-current" /> Unlocked
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {criticalGuardDialog}
    </DashboardLayout>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs">
      <span className="text-brand">{icon}</span>
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold">{value}</span>
    </div>
  );
}

/* ---------------- Focus Timer (Pomodoro) ---------------- */

type Mode = "focus" | "short" | "long";
const MODE_MINUTES: Record<Mode, number> = { focus: 25, short: 5, long: 15 };

function FocusTimer({ onSessionComplete }: { onSessionComplete: (min: number) => void }) {
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODE_MINUTES.focus * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on mode change
  useEffect(() => {
    setSecondsLeft(MODE_MINUTES[mode] * 60);
    setRunning(false);
  }, [mode]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // session complete
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          if (mode === "focus") {
            onSessionComplete(MODE_MINUTES.focus);
            setSessions((n) => n + 1);
            toast.success("Focus session complete!", {
              description: "Take a 5-minute break.",
              icon: <Brain className="h-4 w-4" />,
            });
          } else {
            toast("Break over — back to focus!");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, onSessionComplete]);

  const total = MODE_MINUTES[mode] * 60;
  const progress = ((total - secondsLeft) / total) * 100;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="relative overflow-hidden rounded-3xl gradient-ocean p-4 text-white shadow-glow sm:p-6">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand-glow/30 blur-3xl animate-float" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
            <Brain className="h-3.5 w-3.5" /> Focus Timer
          </div>
          <Badge className="bg-white/15 text-white border-0 hover:bg-white/15">
            {sessions} session{sessions === 1 ? "" : "s"}
          </Badge>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-4">
          <TabsList className="h-auto w-full flex-wrap justify-start bg-white/10 border border-white/10">
            <TabsTrigger value="focus" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Brain className="h-3 w-3" /> Focus
            </TabsTrigger>
            <TabsTrigger value="short" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Coffee className="h-3 w-3" /> Short
            </TabsTrigger>
            <TabsTrigger value="long" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-foreground">
              <Coffee className="h-3 w-3" /> Long
            </TabsTrigger>
          </TabsList>
          <TabsContent value="focus" className="mt-4">
            <FocusTimerPanel
              mode="focus"
              running={running}
              progress={progress}
              mm={mm}
              ss={ss}
              onToggle={() => setRunning((r) => !r)}
              onReset={() => {
                setRunning(false);
                setSecondsLeft(MODE_MINUTES.focus * 60);
              }}
            />
          </TabsContent>
          <TabsContent value="short" className="mt-4">
            <FocusTimerPanel
              mode="short"
              running={running}
              progress={progress}
              mm={mm}
              ss={ss}
              onToggle={() => setRunning((r) => !r)}
              onReset={() => {
                setRunning(false);
                setSecondsLeft(MODE_MINUTES.short * 60);
              }}
            />
          </TabsContent>
          <TabsContent value="long" className="mt-4">
            <FocusTimerPanel
              mode="long"
              running={running}
              progress={progress}
              mm={mm}
              ss={ss}
              onToggle={() => setRunning((r) => !r)}
              onReset={() => {
                setRunning(false);
                setSecondsLeft(MODE_MINUTES.long * 60);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FocusTimerPanel({
  mode,
  running,
  progress,
  mm,
  ss,
  onToggle,
  onReset,
}: {
  mode: Mode;
  running: boolean;
  progress: number;
  mm: string;
  ss: string;
  onToggle: () => void;
  onReset: () => void;
}) {
  const R = 78;
  const C = 2 * Math.PI * R;
  const offset = C - (progress / 100) * C;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40 sm:h-48 sm:w-48">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={R} stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none" />
          <circle
            cx="90"
            cy="90"
            r={R}
            stroke="var(--brand-glow)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">
            {mm}:{ss}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-white/70">
            {mode === "focus" ? "Deep work" : mode === "short" ? "Short break" : "Long break"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          onClick={onToggle}
          className="w-full rounded-full bg-white text-foreground hover:bg-white/90 sm:w-auto"
        >
          {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
        >
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
