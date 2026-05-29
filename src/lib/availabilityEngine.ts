import {
  readStoredProfile,
  stripProfileStorage,
  toProfileStorage,
  writeStoredProfile,
} from "@/hooks/useStudentProfile";
import type { WeeklySchedule } from "@/types/aura-engine-contracts";

export type { WeeklySchedule };

export interface DayPlan {
  date: string;
  dayName: keyof WeeklySchedule;
  availableMinutes: number;
  isUnavailable: boolean;
  taskSlots: number;
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: 120,
  tuesday: 120,
  wednesday: 120,
  thursday: 120,
  friday: 120,
  saturday: 180,
  sunday: 60,
};

const WEEKDAY_KEYS: (keyof WeeklySchedule)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const PLANNER_DAY_ORDER: (keyof WeeklySchedule)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const ONBOARDING_DAY_TO_KEY: Record<string, keyof WeeklySchedule> = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
  Sun: "sunday",
};

const MINUTES_PER_TASK_SLOT = 30;
const MAX_TASKS_PER_DAY = 4;

function taskSlotsFromMinutes(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.floor(minutes / MINUTES_PER_TASK_SLOT);
}

export function getDayKeyFromDate(date: Date = new Date()): keyof WeeklySchedule {
  return WEEKDAY_KEYS[date.getDay()];
}

export function getTodayAvailability(schedule: WeeklySchedule): DayPlan {
  const today = new Date();
  const key = getDayKeyFromDate(today);
  const minutes = schedule[key] ?? 120;

  return {
    date: today.toISOString().split("T")[0],
    dayName: key,
    availableMinutes: minutes,
    isUnavailable: minutes === 0,
    taskSlots: taskSlotsFromMinutes(minutes),
  };
}

export function buildWeekPlan(schedule: WeeklySchedule): DayPlan[] {
  return PLANNER_DAY_ORDER.map((day, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const minutes = schedule[day] ?? 0;

    return {
      date: date.toISOString().split("T")[0],
      dayName: day,
      availableMinutes: minutes,
      isUnavailable: minutes === 0,
      taskSlots: taskSlotsFromMinutes(minutes),
    };
  });
}

export function distributeTasksAcrossWeek<T>(
  rankedChapters: T[],
  weekPlan: DayPlan[],
): Record<string, T[]> {
  const distribution: Record<string, T[]> = {};
  let chapterIndex = 0;

  for (const day of weekPlan) {
    distribution[day.date] = [];
    if (day.isUnavailable) continue;

    const slots = Math.min(day.taskSlots, MAX_TASKS_PER_DAY);
    for (let i = 0; i < slots; i++) {
      if (chapterIndex < rankedChapters.length) {
        distribution[day.date].push(
          rankedChapters[chapterIndex % rankedChapters.length],
        );
        chapterIndex++;
      }
    }
  }

  return distribution;
}

export function buildWeeklyScheduleFromOnboarding(
  unavailableDays: string[],
  dailyMinutes: number,
): WeeklySchedule {
  const unavailable = new Set(
    unavailableDays
      .map((d) => ONBOARDING_DAY_TO_KEY[d])
      .filter((k): k is keyof WeeklySchedule => !!k),
  );

  return PLANNER_DAY_ORDER.reduce((acc, day) => {
    acc[day] = unavailable.has(day) ? 0 : dailyMinutes;
    return acc;
  }, {} as WeeklySchedule);
}

export function syncWeeklyScheduleToAcademicProfile(schedule: WeeklySchedule): void {
  const stored = readStoredProfile();
  if (!stored) return;

  const { profile, masteryReadings } = stripProfileStorage(stored);
  writeStoredProfile(
    toProfileStorage(
      {
        ...profile,
        weeklySchedule: schedule,
      },
      masteryReadings,
    ),
  );
}

export function effectiveTaskLimit(dayPlan: DayPlan): number {
  if (dayPlan.isUnavailable || dayPlan.taskSlots === 0) return 0;
  return Math.min(Math.max(1, dayPlan.taskSlots), MAX_TASKS_PER_DAY);
}
