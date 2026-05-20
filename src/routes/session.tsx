import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Coffee,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  Square,
  Trophy,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useStudySession } from "@/hooks/use-study-session";
import { getDaysToExam, studyStreak } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  taskId: z.string().min(1),
});

export const Route = createFileRoute("/session")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Study Session — Project Aura" },
      {
        name: "description",
        content:
          "Distraction-free focus mode with adaptive pomodoro, AI coach hints, and automatic revision scheduling.",
      },
    ],
  }),
  component: SessionPage,
});

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function SessionPage() {
  const { taskId } = useSearch({ from: "/session" });
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const daysToExam = getDaysToExam();

  const session = useStudySession({
    taskId,
    daysToExam,
    streakDays: studyStreak,
  });

  // Fullscreen toggle (focus phase only)
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

  if (session.loading) {
    return <SessionShell><Centered>Loading session…</Centered></SessionShell>;
  }
  if (!session.task) {
    return (
      <SessionShell>
        <Centered>
          <p className="text-sm text-muted-foreground">Task not found in today's plan.</p>
          <Button asChild className="mt-4 rounded-2xl"><Link to="/">Back to Today</Link></Button>
        </Centered>
      </SessionShell>
    );
  }

  const totalSeconds =
    (session.phase === "focus"
      ? session.cadence.focusMin
      : session.phase === "short"
        ? session.cadence.shortMin
        : session.cadence.longMin) * 60;
  const progressPct =
    totalSeconds > 0 ? Math.max(0, Math.min(100, ((totalSeconds - session.secondsLeft) / totalSeconds) * 100)) : 0;

  return (
    <SessionShell>
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => navigate({ to: "/" })}
          aria-label="Exit session"
          className="press inline-flex items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Exit
        </button>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Focus mode
        </div>
        <button
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
          className="press rounded-xl bg-secondary p-1.5 text-foreground/70"
        >
          {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </header>

      {session.stage === "setup" && (
        <SetupStage
          taskTitle={session.task.title}
          subject={session.task.subject ?? "Today"}
          targetMin={session.task.durationMin}
          reason={session.task.reason}
          cycles={session.cadence.totalFocusBlocks}
          focusMin={session.cadence.focusMin}
          onStart={session.start}
        />
      )}

      {(session.stage === "active" || session.stage === "paused") && (
        <ActiveStage
          taskTitle={session.task.title}
          subject={session.task.subject ?? "Today"}
          phase={session.phase}
          secondsLeft={session.secondsLeft}
          progress={progressPct}
          paused={session.stage === "paused"}
          pomodorosDone={session.pomodoros}
          totalCycles={session.cadence.totalFocusBlocks}
          coachCue={session.coachCue}
          coachLoading={session.coachLoading}
          coachHint={session.coachHint}
          hintLoading={session.hintLoading}
          hintsUsed={session.hintsUsed}
          onTogglePause={session.togglePause}
          onSkip={session.skipPhase}
          onEnd={session.endEarly}
          onHint={(ctx) => void session.requestHint(ctx)}
        />
      )}

      {session.stage === "review" && (
        <ReviewStage
          taskTitle={session.task.title}
          focusedMinutes={Math.max(1, Math.round(session.focusedSeconds / 60))}
          pomodoros={session.pomodoros}
          hintsUsed={session.hintsUsed}
          onSubmit={async (input) => {
            await session.complete(input);
          }}
        />
      )}

      {session.stage === "done" && (
        <CompletionStage
          taskTitle={session.task.title}
          subject={session.task.subject ?? "Today"}
          focusedMinutes={Math.max(1, Math.round(session.focusedSeconds / 60))}
          pomodoros={session.pomodoros}
          firstName={(profile?.studentName || profile?.displayName || user?.displayName || "friend").split(" ")[0]}
        />
      )}
    </SessionShell>
  );
}

function SessionShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

/* ---------------- Setup ---------------- */
function SetupStage({
  taskTitle,
  subject,
  targetMin,
  reason,
  cycles,
  focusMin,
  onStart,
}: {
  taskTitle: string;
  subject: string;
  targetMin: number;
  reason?: string;
  cycles: number;
  focusMin: number;
  onStart: () => void;
}) {
  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-24 animate-fade-in">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-primary">
        <Brain className="h-3.5 w-3.5" /> {subject}
      </div>
      <h1 className="mt-3 font-display text-[26px] font-bold leading-tight tracking-tight">{taskTitle}</h1>
      {reason && (
        <p className="mt-2 rounded-2xl bg-secondary px-3 py-2 text-[12px] leading-snug text-foreground/75">
          {reason}
        </p>
      )}

      <section className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Target" value={`${targetMin}m`} />
        <Stat label="Cycles" value={`${cycles}`} />
        <Stat label="Focus" value={`${focusMin}m`} />
      </section>

      <section className="mt-5 rounded-3xl bg-card p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">What to expect</div>
        <ul className="mt-2 space-y-2 text-sm text-foreground/85">
          <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" /> AI coach greeting to set intention</li>
          <li className="flex items-start gap-2"><Coffee className="mt-0.5 h-3.5 w-3.5 text-primary" /> Adaptive pomodoro with short breaks</li>
          <li className="flex items-start gap-2"><Wand2 className="mt-0.5 h-3.5 w-3.5 text-primary" /> One-tap Socratic hints when stuck</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" /> Auto-schedules your next revision</li>
        </ul>
      </section>

      <Button onClick={onStart} className="press mt-6 h-12 w-full rounded-2xl text-sm font-semibold">
        Begin session <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-soft">
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------------- Active / Paused ---------------- */
function ActiveStage(props: {
  taskTitle: string;
  subject: string;
  phase: "focus" | "short" | "long";
  secondsLeft: number;
  progress: number;
  paused: boolean;
  pomodorosDone: number;
  totalCycles: number;
  coachCue: { motivation: string; nextStep?: string } | null;
  coachLoading: boolean;
  coachHint: { hint: string; followUp?: string } | null;
  hintLoading: boolean;
  hintsUsed: number;
  onTogglePause: () => void;
  onSkip: () => void;
  onEnd: () => void;
  onHint: (ctx: string) => void;
}) {
  const [hintCtx, setHintCtx] = useState("");

  const R = 110;
  const C = 2 * Math.PI * R;
  const offset = C - (props.progress / 100) * C;

  const phaseLabel = props.phase === "focus" ? "Deep work" : props.phase === "short" ? "Short break" : "Long break";
  const phaseTone =
    props.phase === "focus" ? "text-primary" : "text-success";

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-5 pt-4 pb-24 animate-fade-in">
      <div className="text-center">
        <div className={cn("text-[11px] uppercase tracking-widest", phaseTone)}>{phaseLabel}</div>
        <h2 className="mt-1 max-w-[22ch] truncate font-display text-base font-semibold text-foreground/90">
          {props.taskTitle}
        </h2>
        <div className="text-[11px] text-muted-foreground">{props.subject}</div>
      </div>

      {/* Timer ring */}
      <div className="relative mt-6 h-[260px] w-[260px]">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 240 240">
          <circle
            cx="120" cy="120" r={R}
            stroke="color-mix(in oklab, var(--foreground) 8%, transparent)"
            strokeWidth="10" fill="none"
          />
          <circle
            cx="120" cy="120" r={R}
            stroke="var(--primary)" strokeWidth="10" fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-6xl font-bold tabular-nums">{fmt(props.secondsLeft)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            {props.pomodorosDone}/{props.totalCycles} cycles
          </div>
          {props.paused && (
            <div className="mt-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
              Paused
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center gap-2">
        <Button
          onClick={props.onTogglePause}
          className="press h-12 rounded-full px-6 text-sm font-semibold"
        >
          {props.paused ? <><Play className="mr-1 h-4 w-4" /> Resume</> : <><Pause className="mr-1 h-4 w-4" /> Pause</>}
        </Button>
        <Button variant="outline" onClick={props.onSkip} className="press h-12 rounded-full px-4">
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={props.onEnd} className="press h-12 rounded-full px-4 text-destructive">
          <Square className="h-4 w-4" />
        </Button>
      </div>

      {/* AI coach */}
      <section className="mt-6 w-full rounded-3xl bg-card p-4 shadow-soft animate-fade-in">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI coach
        </div>
        {props.coachLoading && !props.coachCue ? (
          <p className="mt-2 text-sm text-muted-foreground">Composing your opening cue…</p>
        ) : props.coachCue ? (
          <div className="mt-2">
            <p className="text-sm font-medium text-foreground">{props.coachCue.motivation}</p>
            {props.coachCue.nextStep && (
              <p className="mt-1 text-[12px] text-muted-foreground">{props.coachCue.nextStep}</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-foreground/85">
            Set a single intention for this block. One concrete win is enough.
          </p>
        )}
      </section>

      {/* Practice / hint */}
      <section className="mt-3 w-full rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Stuck? Ask for a hint</span>
          <span>{props.hintsUsed} used</span>
        </div>
        <Textarea
          rows={2}
          placeholder="e.g. I can't simplify √48"
          value={hintCtx}
          onChange={(e) => setHintCtx(e.target.value)}
          className="mt-2 rounded-2xl"
        />
        <Button
          onClick={() => props.onHint(hintCtx)}
          disabled={props.hintLoading}
          variant="secondary"
          className="press mt-2 h-10 w-full rounded-2xl text-sm font-semibold"
        >
          <Wand2 className="mr-1 h-4 w-4" />
          {props.hintLoading ? "Thinking…" : "Get Socratic hint"}
        </Button>
        {props.coachHint && (
          <div className="mt-3 rounded-2xl bg-primary/10 p-3 text-sm leading-snug text-foreground/90 animate-fade-in">
            <div className="font-medium">{props.coachHint.hint}</div>
            {props.coachHint.followUp && (
              <div className="mt-1 text-[12px] italic text-muted-foreground">
                {props.coachHint.followUp}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------------- Review ---------------- */
function ReviewStage({
  taskTitle,
  focusedMinutes,
  pomodoros,
  hintsUsed,
  onSubmit,
}: {
  taskTitle: string;
  focusedMinutes: number;
  pomodoros: number;
  hintsUsed: number;
  onSubmit: (input: { confidence: number; difficulty: number; note?: string }) => Promise<void>;
}) {
  const [confidence, setConfidence] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <main className="mx-auto max-w-md px-5 pt-4 pb-24 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Block complete
        </div>
        <h2 className="mt-2 font-display text-[22px] font-bold leading-tight">{taskTitle}</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {focusedMinutes}m focused · {pomodoros} cycle{pomodoros === 1 ? "" : "s"} · {hintsUsed} hint{hintsUsed === 1 ? "" : "s"}
        </p>
      </div>

      <section className="mt-5 rounded-3xl bg-card p-4 shadow-soft">
        <Label>How confident do you feel?</Label>
        <FiveScale value={confidence} onChange={setConfidence} lo="Foggy" hi="Solid" />

        <div className="mt-4">
          <Label>How hard did it feel?</Label>
          <FiveScale value={difficulty} onChange={setDifficulty} lo="Light" hi="Tough" />
        </div>

        <div className="mt-4">
          <Label>Notes (optional)</Label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What clicked? What still feels shaky?"
            className="mt-2 rounded-2xl"
          />
        </div>
      </section>

      <Button
        onClick={async () => {
          setSaving(true);
          await onSubmit({ confidence, difficulty, note: note || undefined });
          setSaving(false);
        }}
        disabled={saving}
        className="press mt-5 h-12 w-full rounded-2xl text-sm font-semibold"
      >
        {saving ? "Saving…" : "Finish & schedule revision"}
      </Button>
    </main>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  );
}

function FiveScale({
  value, onChange, lo, hi,
}: { value: number; onChange: (n: number) => void; lo: string; hi: string }) {
  return (
    <div>
      <div className="mt-2 flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "press h-11 flex-1 rounded-2xl text-sm font-semibold transition-colors",
              value === n ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{lo}</span><span>{hi}</span>
      </div>
    </div>
  );
}

/* ---------------- Completion ---------------- */
function CompletionStage({
  taskTitle,
  subject,
  focusedMinutes,
  pomodoros,
  firstName,
}: {
  taskTitle: string;
  subject: string;
  focusedMinutes: number;
  pomodoros: number;
  firstName: string;
}) {
  // Cheap inline summary — true XP/mastery numbers were persisted server-side,
  // we surface a calm celebration here without re-running the math.
  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-24 animate-fade-in">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Trophy className="h-7 w-7" />
        </div>
        <h2 className="mt-3 font-display text-[24px] font-bold leading-tight">
          Nicely done, {firstName} 🌿
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {taskTitle} · {subject}
        </p>
      </div>

      <section className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Focus" value={`${focusedMinutes}m`} />
        <Stat label="Cycles" value={`${pomodoros}`} />
        <Stat label="Streak" value={`+1`} />
      </section>

      <section className="mt-5 rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> What just happened
        </div>
        <ul className="mt-2 space-y-2 text-sm text-foreground/85">
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" /> Task marked complete on today's plan</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" /> XP and mastery updated</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" /> Revision scheduled based on your confidence</li>
        </ul>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" className="press h-12 rounded-2xl text-sm font-semibold">
          <Link to="/">Back to Today</Link>
        </Button>
        <Button asChild className="press h-12 rounded-2xl text-sm font-semibold">
          <Link to="/planner">Open planner <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>
    </main>
  );
}