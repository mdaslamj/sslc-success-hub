/** Local YYYY-MM-DD for the user's timezone. */
export function dayKeyFor(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Stable id for daily-plan / reflection docs. */
export function dailyDocId(userId: string, dayKey: string): string {
  return `${userId}_${dayKey}`;
}