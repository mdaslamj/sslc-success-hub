import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const SUBJECT_ABBR = {
  math: "MATH",
  science: "SCI",
  social: "SSc",
};

function AnimatedNumber({ value, decimals = 1 }) {
  const spring = useSpring(value, { stiffness: 90, damping: 18, mass: 0.6 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [spring]);

  return <>{decimals === 0 ? Math.round(display) : display.toFixed(decimals)}</>;
}

function MasteryBar({ subject, delta, pulseKey }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider"
            style={{
              color: subject.color,
              backgroundColor: `${subject.color}18`,
              border: `1px solid ${subject.color}33`,
            }}
          >
            {SUBJECT_ABBR[subject.id] ?? subject.id.slice(0, 3).toUpperCase()}
          </span>
          <span className="truncate text-muted-foreground">{subject.label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 tabular-nums">
          <AnimatePresence mode="popLayout">
            {delta > 0 && (
              <motion.span
                key={`${subject.id}-${pulseKey}`}
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-[10px] font-semibold text-emerald-400"
              >
                +{delta.toFixed(1)}%
              </motion.span>
            )}
          </AnimatePresence>
          <span className="font-semibold text-foreground">
            <AnimatedNumber value={subject.mastery} decimals={0} />%
          </span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-background/60">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${subject.color}88, ${subject.color})`,
            boxShadow: `0 0 12px ${subject.color}44`,
          }}
          initial={false}
          animate={{ width: `${Math.min(100, subject.mastery)}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full opacity-40"
          style={{ background: subject.color }}
          initial={false}
          animate={{ width: `${Math.min(100, subject.predicted)}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 22, delay: 0.05 }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground">
        Predicted score · {Math.round(subject.predicted)}%
      </div>
    </div>
  );
}

/**
 * Aura Execution System — live trajectory panel for Study Planner.
 * Every completed task visibly shifts readiness, mastery, and target gap.
 */
export function AuraExecutionSystem({ snapshot, compact = false }) {
  const {
    readiness,
    targetScore,
    gap,
    gapBefore,
    trajectoryShift,
    subjects,
    probability,
    burnout,
    lastImpact,
  } = snapshot;

  const gapCompression = Math.max(0, gapBefore - gap);
  const pulseKey = lastImpact?.taskId ?? 0;
  const gapPercent = targetScore > 0 ? Math.min(100, (readiness / targetScore) * 100) : 0;

  const readinessSpring = useSpring(readiness, { stiffness: 70, damping: 16 });
  const gapWidth = useTransform(readinessSpring, (v) =>
    targetScore > 0 ? `${Math.min(100, (v / targetScore) * 100)}%` : "0%",
  );

  useEffect(() => {
    readinessSpring.set(readiness);
  }, [readiness, readinessSpring]);

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-background shadow-card ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6"
      }`}
      aria-label="Academic trajectory"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, hsl(var(--brand)/0.35), transparent 70%)" }}
      />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full blur-3xl opacity-20 bg-emerald-500/20" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              <Activity className="h-3 w-3 text-brand" />
              Execution trajectory
            </div>
            <h2 className="mt-1 font-display text-lg sm:text-xl font-bold tracking-tight">
              Every action shifts your path
            </h2>
            <p className="mt-1 max-w-xl text-xs sm:text-sm text-muted-foreground leading-snug">
              Complete today&apos;s plan and watch readiness, mastery, and your target gap move in
              real time.
            </p>
          </div>
          <Link
            to="/targets"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-brand/40 hover:text-brand"
          >
            Targets
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Readiness + gap */}
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="flex flex-wrap items-end gap-3">
              <motion.div
                key={readiness}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                className="font-display text-4xl sm:text-5xl font-black tracking-tight tabular-nums"
              >
                <span className="gradient-text">
                  <AnimatedNumber value={readiness} decimals={1} />
                </span>
                <span className="text-2xl sm:text-3xl text-muted-foreground">%</span>
              </motion.div>
              <AnimatePresence mode="popLayout">
                {trajectoryShift > 0 && (
                  <motion.div
                    key={`shift-${pulseKey}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400"
                  >
                    <TrendingUp className="h-3 w-3" />
                    +{trajectoryShift} trajectory
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Board readiness · live projection</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full gap-1 text-[10px]">
              <Target className="h-3 w-3" />
              Target {targetScore}%
            </Badge>
            <Badge variant="outline" className="rounded-full gap-1 text-[10px]">
              <Sparkles className="h-3 w-3 text-brand" />
              {probability}% hit probability
            </Badge>
          </div>
        </div>

        {/* Gap compression bar */}
        <div className="mt-5 rounded-2xl border border-border/50 bg-background/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">Target gap</span>
            <div className="flex items-center gap-2 tabular-nums">
              <AnimatePresence mode="popLayout">
                {gapCompression > 0.05 && (
                  <motion.span
                    key={`gap-${pulseKey}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-semibold text-emerald-400"
                  >
                    −{gapCompression.toFixed(1)} pts closed
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="text-muted-foreground">
                <AnimatedNumber value={gap} decimals={1} /> pts to go
              </span>
            </div>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand/80 to-brand"
              style={{ width: gapWidth }}
            />
            <div
              className="absolute inset-y-0 border-r-2 border-dashed border-foreground/30"
              style={{ left: `${Math.min(99, gapPercent)}%` }}
              aria-hidden
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>Current {readiness.toFixed(1)}%</span>
            <span>Goal {targetScore}%</span>
          </div>
        </div>

        {/* Subject mastery */}
        <div className="mt-5 space-y-4">
          <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
            Subject mastery
          </div>
          {subjects.map((subject) => (
            <MasteryBar
              key={subject.id}
              subject={subject}
              delta={subject.delta}
              pulseKey={pulseKey}
            />
          ))}
        </div>

        {/* Burnout strip + last impact */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-[11px]">
            <span
              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                burnout.risk === "high"
                  ? "bg-destructive"
                  : burnout.risk === "medium"
                    ? "bg-warning"
                    : "bg-emerald-400"
              }`}
            />
            <div className="min-w-0">
              <span className="font-medium capitalize">{burnout.risk} load</span>
              <span className="text-muted-foreground"> · {burnout.recommendation}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {lastImpact && (
              <motion.div
                key={lastImpact.taskId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">
                  Last shift: +{lastImpact.readinessDelta.toFixed(2)}% from &ldquo;
                  {lastImpact.label}&rdquo;
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!compact && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Session momentum</span>
              <span>{Math.round(gapPercent)}% of target reached</span>
            </div>
            <Progress value={gapPercent} className="h-1.5" />
          </div>
        )}
      </div>
    </section>
  );
}

export default AuraExecutionSystem;
