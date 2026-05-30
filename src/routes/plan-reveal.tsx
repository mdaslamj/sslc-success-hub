import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PlanReveal } from "@/components/onboarding/PlanReveal";
import type { PricingTier } from "@/components/onboarding/ConversationalOnboarding";
import { useAuth } from "@/contexts/auth-context";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  getTodayAvailability,
  effectiveTaskLimit,
  type WeeklySchedule,
} from "@/lib/availabilityEngine";
import { buildPlannerChapterPool } from "@/lib/planner-chapter-pool";
import { hasSeenPlanReveal, markPlanRevealSeen } from "@/lib/plan-reveal-storage";
import { subjects } from "@/lib/mock-data";
import { rankChaptersForToday, type RankedPlannerTask } from "@/lib/taskPriorityEngine";

const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_KEY_TO_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

type GuestOnboardingPayload = {
  name?: string;
  weak?: string[];
  examDate?: string;
  unavailableDays?: string[];
  pricingTier?: PricingTier;
  weeklySchedule?: WeeklySchedule;
  capacity?: number;
};

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 0;
  const exam = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86_400_000));
}

function sessionsPerDayFromSchedule(schedule: WeeklySchedule): number {
  const slotMinutes = 30;
  const slots = Object.values(schedule)
    .map((minutes) => (minutes > 0 ? Math.floor(minutes / slotMinutes) : 0))
    .filter((n) => n > 0);
  if (!slots.length) return effectiveTaskLimit(getTodayAvailability(schedule));
  return Math.round(slots.reduce((sum, n) => sum + n, 0) / slots.length);
}

function scheduleDayLabels(schedule: WeeklySchedule): {
  available: string[];
  rest: string[];
} {
  const rest: string[] = [];
  const available: string[] = [];
  for (const [key, label] of Object.entries(DAY_KEY_TO_LABEL)) {
    const minutes = schedule[key as keyof WeeklySchedule] ?? 0;
    if (minutes <= 0) rest.push(label);
    else available.push(label);
  }
  return { available, rest };
}

function readGuestOnboarding(): GuestOnboardingPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_ONBOARDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestOnboardingPayload;
  } catch {
    return null;
  }
}

const plannerSubjects = subjects.map((s) => ({
  id: s.id,
  name: s.name,
  color: s.color,
  target: s.target,
  predicted: s.predicted,
  mastery: s.mastery,
  emoji: s.emoji,
}));

export const Route = createFileRoute("/plan-reveal")({
  head: () => ({
    meta: [
      { title: "Your plan is ready — Aura" },
      {
        name: "description",
        content: "See what Aura built for your SSLC study plan.",
      },
    ],
  }),
  component: PlanRevealPage,
});

function PlanRevealPage() {
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();
  const { profile: engineProfile, isLoading } = useAuraEngines();
  const [topTask, setTopTask] = useState<RankedPlannerTask | null>(null);

  useEffect(() => {
    if (hasSeenPlanReveal()) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  const guest = useMemo(() => readGuestOnboarding(), []);

  const studentName =
    authProfile?.studentName ??
    authProfile?.displayName ??
    guest?.name ??
    engineProfile?.student.name ??
    "Student";

  const examDate = authProfile?.examTargetDate ?? guest?.examDate;
  const daysToExam =
    engineProfile?.student.daysToExam ?? daysUntil(examDate);

  const worriedSubjectId =
    authProfile?.weakSubjects?.[0] ?? guest?.weak?.[0] ?? "science";

  const worriedSubjectColor =
    subjects.find((s) => s.id === worriedSubjectId)?.color ?? "#8B5CF6";

  const weeklySchedule: WeeklySchedule =
    engineProfile?.weeklySchedule ??
    guest?.weeklySchedule ??
    DEFAULT_WEEKLY_SCHEDULE;

  const unavailableFromGuest = guest?.unavailableDays ?? [];
  const { available, rest } = scheduleDayLabels(weeklySchedule);
  const availableDays =
    unavailableFromGuest.length > 0
      ? WEEKDAY_LABELS.filter((d) => !unavailableFromGuest.includes(d))
      : available;
  const restDays =
    unavailableFromGuest.length > 0 ? unavailableFromGuest : rest;

  const pricingTier: PricingTier =
    authProfile?.pricingTier ?? guest?.pricingTier ?? "urban";

  useEffect(() => {
    let cancelled = false;
    void rankChaptersForToday(buildPlannerChapterPool(), plannerSubjects, 1).then(
      (tasks) => {
        if (!cancelled) setTopTask(tasks[0] ?? null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = (to: "/" | "/planner") => {
    markPlanRevealSeen();
    navigate({ to });
  };

  if (isLoading && !guest && !authProfile) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center text-sm"
        style={{ background: "#08080E", color: "rgba(240,240,248,0.70)" }}
      >
        Preparing your plan…
      </div>
    );
  }

  return (
    <PlanReveal
      studentName={studentName}
      examDate={examDate}
      daysToExam={daysToExam}
      topTask={topTask}
      worriedSubjectId={worriedSubjectId}
      worriedSubjectColor={worriedSubjectColor}
      sessionsPerDay={sessionsPerDayFromSchedule(weeklySchedule)}
      availableDays={[...availableDays]}
      restDays={[...restDays]}
      pricingTier={pricingTier}
      onStart={() => finish("/planner")}
      onSkip={() => finish("/")}
    />
  );
}
