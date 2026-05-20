/**
 * Local-storage fallback for guest users — mirrors the Firestore docs so the
 * Daily Engine works end-to-end without an account.
 */
import type {
  DailyPlanDoc,
  DailyReflectionDoc,
  MotivationEventDoc,
} from "@/integrations/firebase/types";

const PLAN_PREFIX = "aura.daily.plan.";
const REFL_PREFIX = "aura.daily.reflection.";
const MOT_KEY = "aura.daily.motivation.v1";

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export const localDaily = {
  getPlan: (dayKey: string) => safeGet<DailyPlanDoc>(PLAN_PREFIX + dayKey),
  setPlan: (plan: DailyPlanDoc) => safeSet(PLAN_PREFIX + plan.dayKey, plan),
  getReflection: (dayKey: string) => safeGet<DailyReflectionDoc>(REFL_PREFIX + dayKey),
  setReflection: (r: DailyReflectionDoc) => safeSet(REFL_PREFIX + r.dayKey, r),
  pushMotivation: (e: MotivationEventDoc) => {
    const list = safeGet<MotivationEventDoc[]>(MOT_KEY) ?? [];
    safeSet(MOT_KEY, [e, ...list].slice(0, 20));
  },
  listMotivation: () => safeGet<MotivationEventDoc[]>(MOT_KEY) ?? [],
};