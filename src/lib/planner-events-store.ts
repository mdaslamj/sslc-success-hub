/**
 * Lightweight planner-events store. Local-first (localStorage), mirrors the
 * shape of `planner-store` so we can swap to Firestore later without changing
 * the calling surface. Powers the academic + life calendar layer that sits
 * alongside today's auto-generated planner tasks.
 */

export type PlannerEventCategory =
  | "study"
  | "revision"
  | "mock-exam"
  | "school"
  | "tuition"
  | "break"
  | "sports"
  | "festival"
  | "personal";

export type PlannerEvent = {
  id: string;
  title: string;
  category: PlannerEventCategory;
  /** ISO date string YYYY-MM-DD (local). */
  date: string;
  /** Optional HH:mm start time. */
  time?: string;
  /** Optional duration in minutes (for academic balance math). */
  durationMin?: number;
  subject?: string;
  note?: string;
  createdAt: number;
};

export const EVENT_CATEGORIES: {
  id: PlannerEventCategory;
  label: string;
  emoji: string;
  /** Tailwind color token chip — uses semantic surfaces only. */
  tone:
    | "brand"
    | "success"
    | "warning"
    | "destructive"
    | "muted";
}[] = [
  { id: "study", label: "Study", emoji: "📚", tone: "brand" },
  { id: "revision", label: "Revision", emoji: "🔁", tone: "brand" },
  { id: "mock-exam", label: "Mock Exam", emoji: "📝", tone: "warning" },
  { id: "school", label: "School", emoji: "🏫", tone: "muted" },
  { id: "tuition", label: "Tuition", emoji: "👩‍🏫", tone: "muted" },
  { id: "break", label: "Break", emoji: "☕", tone: "success" },
  { id: "sports", label: "Sports", emoji: "🏃", tone: "success" },
  { id: "festival", label: "Festival", emoji: "🎉", tone: "warning" },
  { id: "personal", label: "Personal", emoji: "💛", tone: "destructive" },
];

const STORAGE = "vidyapath.planner.events.v1";

function readAll(): PlannerEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlannerEvent[]) : [];
  } catch {
    return [];
  }
}

function writeAll(events: PlannerEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(events));
  } catch {
    /* quota — ignore */
  }
}

export function listEvents(): PlannerEvent[] {
  return readAll().sort((a, b) => {
    if (a.date === b.date) return (a.time ?? "").localeCompare(b.time ?? "");
    return a.date.localeCompare(b.date);
  });
}

export function addEvent(input: Omit<PlannerEvent, "id" | "createdAt">): PlannerEvent {
  const evt: PlannerEvent = {
    ...input,
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  writeAll([...readAll(), evt]);
  return evt;
}

export function removeEvent(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

/** Local YYYY-MM-DD (avoids UTC drift from toISOString). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0 = Sunday
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - dow);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function getCategory(id: PlannerEventCategory) {
  return EVENT_CATEGORIES.find((c) => c.id === id) ?? EVENT_CATEGORIES[0];
}