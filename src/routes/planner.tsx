import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { todayTasks, subjects } from "@/lib/mock-data";
import { toast } from "sonner";
import { RevisionPlannerCard, type RevisionPick } from "@/components/revision-planner-card";
import { useAnalytics } from "@/hooks/use-analytics";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Study Planner — VidyaPath" },
      {
        name: "description",
        content:
          "Plan today's SSLC study schedule, run a focus timer, and unlock achievements as you complete tasks.",
      },
    ],
  }),
  component: PlannerPage,
});

type Task = {
  id: number;
  subject: string;
  task: string;
  time: string;
  durationMin: number;
  done: boolean;
  /** Optional external link (e.g. KTBS textbook PDF). */
  link?: string;
};

const STORAGE = "vidyapath.planner.v1";

function estimateMinutes(time: string): number {
  // e.g. "45 min", "1 hr", "30 min"
  const lower = time.toLowerCase();
  const num = parseFloat(lower) || 30;
  if (lower.includes("hr") || lower.includes("hour")) return Math.round(num * 60);
  return Math.round(num);
}

const seedTasks: Task[] = todayTasks.map((t) => ({
  ...t,
  durationMin: estimateMinutes(t.time),
}));

function PlannerPage() {
  const { logSession } = useAnalytics();
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [newTask, setNewTask] = useState("");
  const [newSubject, setNewSubject] = useState(subjects[0].name);
  const [newDuration, setNewDuration] = useState(30);
  const [focusMinutes, setFocusMinutes] = useState(0); // total minutes focused today
  const [hydrated, setHydrated] = useState(false);

  // Hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
        if (typeof parsed.focusMinutes === "number") setFocusMinutes(parsed.focusMinutes);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE, JSON.stringify({ tasks, focusMinutes }));
  }, [tasks, focusMinutes, hydrated]);

  const doneCount = tasks.filter((t) => t.done).length;
  const totalMin = tasks.reduce((a, t) => a + t.durationMin, 0);
  const doneMin = tasks.filter((t) => t.done).reduce((a, t) => a + t.durationMin, 0);
  const completionPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, done: !t.done };
        if (next.done) {
          toast.success("Task completed", {
            description: `${t.subject} · ${t.task}`,
            icon: <CheckCircle2 className="h-4 w-4" />,
          });
        }
        return next;
      }),
    );
  }

  function addTask() {
    if (!newTask.trim()) return;
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [
      ...prev,
      {
        id,
        subject: newSubject,
        task: newTask.trim(),
        time: `${newDuration} min`,
        durationMin: newDuration,
        done: false,
      },
    ]);
    setNewTask("");
    toast("Task added to today's plan");
  }

  function removeTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addFromRecommendation(pick: RevisionPick) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [
      ...prev,
      {
        id,
        subject: pick.subjectName,
        task: `Revise — ${pick.topic}`,
        time: `${pick.minutes} min`,
        durationMin: pick.minutes,
        done: false,
      },
    ]);
    toast.success("Added to today's plan", {
      description: `${pick.subjectName} · ${pick.minutes} min`,
    });
  }

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
        earned: tasks.length > 0 && doneCount === tasks.length,
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
          new Set(tasks.filter((t) => t.done).map((t) => t.subject)).size >= 3,
      },
    ];
    return list;
  }, [doneCount, completionPct, tasks, focusMinutes]);

  const earnedCount = unlocked.filter((a) => a.earned).length;

  return (
    <DashboardLayout title="Study Planner">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Today's Plan
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Plan. <span className="gradient-text">Focus.</span> Win the day.
            </h1>
            <p className="text-sm text-muted-foreground">
              Adaptive schedule with built-in Pomodoro and live achievements.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatPill icon={<CheckCircle2 className="h-4 w-4" />} label="Done" value={`${doneCount}/${tasks.length}`} />
            <StatPill icon={<Clock className="h-4 w-4" />} label="Focused" value={`${focusMinutes}m`} />
            <StatPill icon={<Trophy className="h-4 w-4" />} label="Badges" value={`${earnedCount}/${unlocked.length}`} />
          </div>
        </header>

        {/* Day progress bar */}
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Daily progress</span>
            <span className="text-muted-foreground">
              {doneMin} of {totalMin} planned min · {completionPct}%
            </span>
          </div>
          <Progress value={completionPct} className="mt-3" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* LEFT: schedule */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" /> Today's Schedule
              </h3>
              <Badge variant="outline" className="rounded-full">
                {tasks.length} tasks
              </Badge>
            </div>

            <div className="space-y-2">
              {tasks.map((t) => {
                const subj = subjects.find((s) => s.name.startsWith(t.subject)) ?? subjects[0];
                return (
                  <div
                    key={t.id}
                    className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
                      t.done
                        ? "border-success/30 bg-success/5"
                        : "border-border/60 bg-background/40 hover:border-brand/40"
                    }`}
                  >
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={() => toggleTask(t.id)}
                      className="h-5 w-5"
                    />
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold shrink-0"
                      style={{
                        background: `color-mix(in oklab, ${subj.color} 18%, transparent)`,
                        color: subj.color,
                      }}
                    >
                      {subj.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm font-medium ${
                          t.done ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {t.task}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {t.subject} · {t.time}
                        </span>
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
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                      onClick={() => removeTask(t.id)}
                      aria-label="Remove task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                  No tasks left. Add one below to keep momentum going.
                </div>
              )}
            </div>

            {/* Add task */}
            <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-3">
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
          <section className="space-y-6">
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
    <div className="rounded-full border border-border/60 bg-card px-3 py-1.5 flex items-center gap-2 text-xs">
      <span className="text-brand">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
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

  // SVG ring
  const R = 78;
  const C = 2 * Math.PI * R;
  const offset = C - (progress / 100) * C;

  return (
    <div className="rounded-3xl gradient-ocean p-6 text-white shadow-glow relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand-glow/30 blur-3xl animate-float" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
            <Brain className="h-3.5 w-3.5" /> Focus Timer
          </div>
          <Badge className="bg-white/15 text-white border-0 hover:bg-white/15">
            {sessions} session{sessions === 1 ? "" : "s"}
          </Badge>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-4">
          <TabsList className="bg-white/10 border border-white/10">
            <TabsTrigger value="focus" className="data-[state=active]:bg-white data-[state=active]:text-foreground gap-1">
              <Brain className="h-3 w-3" /> Focus
            </TabsTrigger>
            <TabsTrigger value="short" className="data-[state=active]:bg-white data-[state=active]:text-foreground gap-1">
              <Coffee className="h-3 w-3" /> Short
            </TabsTrigger>
            <TabsTrigger value="long" className="data-[state=active]:bg-white data-[state=active]:text-foreground gap-1">
              <Coffee className="h-3 w-3" /> Long
            </TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="mt-4">
            <div className="flex flex-col items-center">
              <div className="relative h-48 w-48">
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
                  <div className="font-display text-5xl font-bold tabular-nums">{mm}:{ss}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/70">
                    {mode === "focus" ? "Deep work" : mode === "short" ? "Short break" : "Long break"}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  onClick={() => setRunning((r) => !r)}
                  className="rounded-full bg-white text-foreground hover:bg-white/90"
                >
                  {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRunning(false);
                    setSecondsLeft(MODE_MINUTES[mode] * 60);
                  }}
                  className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <RotateCcw className="mr-1 h-4 w-4" /> Reset
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
