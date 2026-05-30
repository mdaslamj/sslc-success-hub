export const PLAN_REVEAL_KEY = "aura_plan_revealed";

export function hasSeenPlanReveal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PLAN_REVEAL_KEY) === "true";
  } catch {
    return false;
  }
}

export function markPlanRevealSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAN_REVEAL_KEY, "true");
  } catch {
    /* storage unavailable */
  }
}
