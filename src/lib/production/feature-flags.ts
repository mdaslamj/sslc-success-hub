/**
 * Feature flags for controlled rollout + beta gating.
 * Defaults are environment-aware (see env-config). Users can override
 * locally via the admin/ops panel; values persist in localStorage.
 */

import { getAppEnv } from "./env-config";

export type FeatureFlag =
  | "voice_tutor"
  | "exam_hall"
  | "parent_dashboard"
  | "teacher_dashboard"
  | "offline_mode"
  | "lightweight_ai"
  | "beta_feedback"
  | "ai_cost_strict"
  | "play_store_mode";

const STORAGE_KEY = "aura:feature-flags:v1";

const DEFAULTS: Record<FeatureFlag, Record<"dev" | "staging" | "production", boolean>> = {
  voice_tutor:        { dev: true,  staging: true,  production: true  },
  exam_hall:          { dev: true,  staging: true,  production: true  },
  parent_dashboard:   { dev: true,  staging: true,  production: true  },
  teacher_dashboard:  { dev: true,  staging: true,  production: true  },
  offline_mode:       { dev: true,  staging: true,  production: true  },
  lightweight_ai:     { dev: true,  staging: true,  production: false },
  beta_feedback:      { dev: true,  staging: true,  production: false },
  ai_cost_strict:     { dev: false, staging: false, production: true  },
  play_store_mode:    { dev: false, staging: false, production: true  },
};

function readOverrides(): Partial<Record<FeatureFlag, boolean>> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeOverrides(v: Partial<Record<FeatureFlag, boolean>>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* swallow */
  }
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const overrides = readOverrides();
  if (typeof overrides[flag] === "boolean") return Boolean(overrides[flag]);
  return DEFAULTS[flag][getAppEnv()];
}

export function setFeatureOverride(flag: FeatureFlag, value: boolean | null) {
  const next = readOverrides();
  if (value === null) delete next[flag];
  else next[flag] = value;
  writeOverrides(next);
}

export function getAllFlagValues(): Array<{
  flag: FeatureFlag;
  value: boolean;
  overridden: boolean;
}> {
  const overrides = readOverrides();
  return (Object.keys(DEFAULTS) as FeatureFlag[]).map((flag) => ({
    flag,
    value: typeof overrides[flag] === "boolean" ? Boolean(overrides[flag]) : DEFAULTS[flag][getAppEnv()],
    overridden: typeof overrides[flag] === "boolean",
  }));
}