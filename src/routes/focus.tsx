import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Coffee,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { subjects } from "@/lib/mock-data";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  formatMMSS,
  useFocusTimer,
  type FocusMode,
} from "@/hooks/use-focus-timer";
import {
  BREAK_MESSAGES,
  FOCUS_COMPLETE_MESSAGES,
  FOCUS_START_MESSAGES,
  pickRandom,
} from "@/lib/motivation";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus Mode — VidyaPath" },
      {
        name: "description",
        content:
          "Distraction-free Pomodoro focus mode for SSLC study sessions. Track chapters, subjects, streaks and total focus time.",
      },
    ],
  }),
  component: FocusPage,
});

type SubjectChapters = { id: string; name: string };

// Lightweight placeholder chapter list per subject — replaced by Firestore
// chapter docs (`useChapters(subjectId)`) once that hook is wired here.
const PLACEHOLDER_CHAPTERS: Record<string, SubjectChapters[]> = {};

function FocusPage() {
  const { logSession, streak, weekly, todayMinutes, focusSessions } =
    useAnalytics();
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ?? "");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [intent, setIntent] = useState<string>("");
  const [customMin, setCustomMin] = useState<number>(25);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string>(() =>
    pickRandom(FOCUS_START_MESSAGES),
  );
  const completedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const timer = useFocusTimer({
    onFocusComplete: (minutes) => {
      const startedAt = Date.now() - minutes * 60 * 1000;
      logSession({
        kind: "focus",
        subjectId: subjectId || undefined,
        chapterId: undefined,
        startedAt,
        endedAt: Date.now(),
        durationMinutes: minutes,
        notes: chapterTitle
          ? `${chapterTitle}${intent ? ` — ${intent}` : ""}`
          : intent || undefined,
      });
      setMessage(pickRandom(FOCUS_COMPLETE_MESSAGES));
      setCompleted(true);
      toast.success("Focus session saved", {
        description: `${minutes} min logged${
          chapterTitle ? ` · ${chapterTitle}` : ""
        }`,
      });
      if (completedTimeoutRef.current) clearTimeout(completedTimeoutRef.current);
      completedTimeoutRef.current = setTimeout(() => setCompleted(false), 2400);
    },
    onComplete: (mode) => {
      if (mode !== "focus") setMessage(pickRandom(BREAK_MESSAGES));
    },
  });

  useEffect(
    () => () => {
      if (completedTimeoutRef.current) clearTimeout(completedTimeoutRef.current);
    },
    [],
  );

  // Fullscreen toggle
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // Refresh motivational message on mode change
  useEffect(() => {
    if (timer.mode === "focus") setMessage(pickRandom(FOCUS_START_MESSAGES));
    else setMessage(pickRandom(BREAK_MESSAGES));
  }, [timer.mode]);

  function applyCustomDuration() {
    timer.setCustomDuration("focus", customMin);
    toast(`Custom focus set to ${customMin} min`);
  }

  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjectId],
  );

  // SVG ring
  const R = 110;
  const C = 2 * Math.PI * R;
  const offset = C - (timer.progress / 100) * C;
  const weekTotal = weekly.reduce((a, d) => a + d.minutes, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal top bar — only essentials. No sidebar, no search. */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand" /> Focus Mode
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            🔥 {streak.current}-day streak
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {todayMinutes}m today
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
          >
            {isFs ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label="Exit focus">
            <Link to="/planner">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-10 md:py-14">
        {/* Mode tabs */}
        <Tabs
          value={timer.mode}
          onValueChange={(v) => timer.setMode(v as FocusMode)}
        >
          <TabsList>
            <TabsTrigger value="focus" className="gap-1">
              <Brain className="h-3 w-3" /> Focus
            </TabsTrigger>
            <TabsTrigger value="short" className="gap-1">
              <Coffee className="h-3 w-3" /> Short
            </TabsTrigger>
            <TabsTrigger value="long" className="gap-1">
              <Coffee className="h-3 w-3" /> Long
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Timer ring */}
        <div
          className={`relative mt-8 h-[260px] w-[260px] transition-transform ${
            completed ? "animate-scale-in" : ""
          }`}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 240 240">
            <circle
              cx="120"
              cy="120"
              r={R}
              stroke="color-mix(in oklab, var(--foreground) 10%, transparent)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="120"
              cy="120"
              r={R}
              stroke="var(--brand)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-6xl font-bold tabular-nums">
              {formatMMSS(timer.secondsLeft)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              {timer.mode === "focus"
                ? "Deep work"
                : timer.mode === "short"
                ? "Short break"
                : "Long break"}
            </div>
          </div>
        </div>

        {/* Motivational line */}
        <p className="mt-6 max-w-md text-center text-sm text-muted-foreground animate-fade-in">
          {message}
        </p>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={timer.toggle}
            className="rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {timer.running ? (
              <Pause className="mr-1 h-4 w-4" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            {timer.running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" onClick={timer.reset} className="rounded-full">
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
          <Button variant="ghost" onClick={timer.skip} className="rounded-full">
            <SkipForward className="mr-1 h-4 w-4" /> Skip
          </Button>
        </div>

        {/* Session context — minimal */}
        <section className="mt-10 grid w-full gap-4 rounded-3xl border border-border/60 bg-card p-5 sm:grid-cols-2">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Subject
            </label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Chapter / topic
            </label>
            <Input
              placeholder={
                subject ? `e.g. ${subject.weakTopics[0] ?? "Chapter 1"}` : "Topic"
              }
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Intention (optional)
            </label>
            <Input
              placeholder="What will you finish in this block?"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Custom focus length (min)
              </label>
              <Input
                type="number"
                min={1}
                max={180}
                step={5}
                value={customMin}
                onChange={(e) => setCustomMin(Number(e.target.value) || 25)}
                className="mt-1 w-32"
              />
            </div>
            <Button
              variant="outline"
              onClick={applyCustomDuration}
              className="rounded-full"
            >
              Apply
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Today: <span className="font-semibold text-foreground">{todayMinutes}m</span>
              {" · "}This week: <span className="font-semibold text-foreground">{weekTotal}m</span>
              {" · "}Sessions: <span className="font-semibold text-foreground">{focusSessions}</span>
            </div>
          </div>
        </section>

        <div className="mt-6 text-center text-[11px] text-muted-foreground">
          Sessions auto-save to your Analytics.{" "}
          <Link to="/analytics" className="story-link">
            View progress
          </Link>
        </div>
      </main>
    </div>
  );
}
