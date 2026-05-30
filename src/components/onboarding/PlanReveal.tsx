import type { ReactNode } from "react";
import type { PricingTier } from "@/components/onboarding/ConversationalOnboarding";
import type { RankedPlannerTask } from "@/lib/taskPriorityEngine";

const SUBJECT_LABELS: Record<string, string> = {
  science: "Science",
  math: "Math",
  social: "Social Science",
  english: "English",
  kannada: "Kannada",
  hindi: "Hindi",
};

const PRICING_COPY: Record<
  PricingTier,
  { school: string; price: string }
> = {
  rural: { school: "Government school", price: "Full Aura access at Rs.49/month" },
  "semi-urban": {
    school: "Private aided",
    price: "Full Aura access at Rs.149/month",
  },
  urban: { school: "Private", price: "Full Aura access at Rs.299/month" },
};

export type PlanRevealProps = {
  studentName: string;
  examDate?: string;
  daysToExam: number;
  topTask: RankedPlannerTask | null;
  worriedSubjectId: string;
  worriedSubjectColor: string;
  sessionsPerDay: number;
  availableDays: string[];
  restDays: string[];
  pricingTier: PricingTier;
  onStart: () => void;
  onSkip: () => void;
};

function formatExamDate(dateStr?: string): string {
  if (!dateStr) return "Board exam date";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function priorityAccent(task: RankedPlannerTask | null): string {
  if (!task) return "#8B5CF6";
  const mastery = task.chapter.mastery ?? 50;
  if (mastery < 55) return "#F87171";
  if (mastery < 70 || task.priorityScore >= 6) return "#FBBF24";
  return "#8B5CF6";
}

function CardShell({
  delay,
  accent,
  children,
}: {
  delay: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div
      className="plan-reveal-card rounded-2xl border p-4"
      style={{
        animationDelay: delay,
        background: "#14141F",
        borderColor: `${accent}33`,
        boxShadow: `inset 3px 0 0 ${accent}`,
      }}
    >
      {children}
    </div>
  );
}

export function PlanReveal({
  studentName,
  examDate,
  daysToExam,
  topTask,
  worriedSubjectId,
  worriedSubjectColor,
  sessionsPerDay,
  availableDays,
  restDays,
  pricingTier,
  onStart,
  onSkip,
}: PlanRevealProps) {
  const weeks = Math.max(1, Math.ceil(daysToExam / 7));
  const worriedLabel = SUBJECT_LABELS[worriedSubjectId] ?? worriedSubjectId;
  const pricing = PRICING_COPY[pricingTier] ?? PRICING_COPY.urban;
  const priorityColor = priorityAccent(topTask);

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{
        background: "#08080E",
        color: "#F0F0F8",
        paddingTop: "max(env(safe-area-inset-top), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        .plan-reveal-card,
        .plan-reveal-actions {
          opacity: 0;
          animation: fadeInUp 0.4s ease forwards;
        }
        .plan-reveal-check {
          animation: checkPop 0.55s ease forwards;
        }
        .plan-reveal-check-path {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: checkDraw 0.45s ease 0.35s forwards;
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6">
        <header className="mb-6 text-center">
          <div
            className="plan-reveal-check mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(139,92,246,0.18)" }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
              />
              <path
                className="plan-reveal-check-path"
                d="M10 18.5 L16 24.5 L26 12"
                fill="none"
                stroke="#4ADE80"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Your plan is ready, {studentName || "Student"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(240,240,248,0.55)" }}>
            Here is what Aura built based on your answers
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          <CardShell delay="0.2s" accent="#8B5CF6">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-300">
              Exam countdown
            </p>
            <p className="mt-1 text-lg font-semibold">
              Board exam in {daysToExam} days
            </p>
            <p className="mt-1 text-sm" style={{ color: "rgba(240,240,248,0.55)" }}>
              {formatExamDate(examDate)} — {weeks} weeks of preparation
            </p>
          </CardShell>

          <CardShell delay="0.4s" accent={priorityColor}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: priorityColor }}>
              Today&apos;s priority
            </p>
            <p className="mt-1 text-lg font-semibold">Your first session</p>
            {topTask ? (
              <>
                <p className="mt-2 text-sm font-medium">{topTask.title}</p>
                <p className="mt-1 text-xs" style={{ color: "rgba(240,240,248,0.55)" }}>
                  {topTask.subject} · {topTask.time}
                </p>
                {topTask.whyText ? (
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(240,240,248,0.72)" }}>
                    {topTask.whyText}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm" style={{ color: "rgba(240,240,248,0.55)" }}>
                Open the planner to see your ranked sessions.
              </p>
            )}
          </CardShell>

          <CardShell delay="0.6s" accent={worriedSubjectColor}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: worriedSubjectColor }}>
              Your focus subject
            </p>
            <p className="mt-1 text-lg font-semibold">
              Starting with {worriedLabel}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(240,240,248,0.55)" }}>
              You told us this worries you most — we have prioritised it in your plan
            </p>
          </CardShell>

          <CardShell delay="0.8s" accent="#4ADE80">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
              Daily schedule
            </p>
            <p className="mt-1 text-lg font-semibold">
              Study plan: {sessionsPerDay} session{sessionsPerDay === 1 ? "" : "s"} per day
            </p>
            <p className="mt-2 text-sm" style={{ color: "rgba(240,240,248,0.55)" }}>
              Available: {availableDays.length ? availableDays.join(", ") : "Every day"}
            </p>
            <p className="mt-1 text-sm" style={{ color: "rgba(240,240,248,0.55)" }}>
              Rest days: {restDays.length ? restDays.join(", ") : "None"}
            </p>
          </CardShell>

          <CardShell delay="1.0s" accent="#38BDF8">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-300">
              Pricing tier
            </p>
            <p className="mt-1 text-lg font-semibold">{pricing.school}</p>
            <p className="mt-2 text-sm font-medium">{pricing.price}</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(240,240,248,0.55)" }}>
              Free for now — upgrade when ready
            </p>
          </CardShell>
        </div>

        <div className="plan-reveal-actions mt-6 space-y-3" style={{ animationDelay: "1.3s" }}>
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-xl py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#8B5CF6" }}
          >
            Start my first session →
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2 text-sm transition-colors hover:text-white"
            style={{ color: "rgba(240,240,248,0.45)" }}
          >
            Explore Aura first
          </button>
        </div>
      </div>
    </div>
  );
}
