/**
 * Environment separation: dev / staging / production.
 * Reads from VITE_APP_ENV with a safe fallback derived from hostname.
 * All downstream code (analytics, monitoring, feature flags, AI cost
 * governance) keys off of `getAppEnv()` so the same bundle stays
 * production-grade across environments without rebuilding.
 */

export type AppEnv = "dev" | "staging" | "production";

export type EnvConfig = {
  env: AppEnv;
  isProd: boolean;
  /** Hostname tag for log routing / Crashlytics. */
  release: string;
  /** Hard limits per-environment for AI cost governance. */
  aiBudget: {
    dailyTokenLimit: number;
    perRequestTokenCap: number;
    cacheTtlMs: number;
  };
  /** Sample rate for product analytics events (0..1). */
  analyticsSampleRate: number;
  /** Sample rate for performance traces. */
  perfSampleRate: number;
};

function detectEnv(): AppEnv {
  const explicit = (
    (typeof import.meta !== "undefined" &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.[
        "VITE_APP_ENV"
      ]) ||
    ""
  ).toLowerCase();
  if (explicit === "dev" || explicit === "staging" || explicit === "production")
    return explicit;
  if (typeof window === "undefined") return "production";
  const host = window.location.hostname;
  if (host === "localhost" || host.endsWith(".local")) return "dev";
  if (host.includes("preview") || host.includes("staging")) return "staging";
  return "production";
}

let cached: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cached) return cached;
  const env = detectEnv();
  const release =
    (typeof import.meta !== "undefined" &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.[
        "VITE_APP_RELEASE"
      ]) ||
    "aura@1.0.0";
  cached = {
    env,
    isProd: env === "production",
    release,
    aiBudget:
      env === "production"
        ? { dailyTokenLimit: 60_000, perRequestTokenCap: 4_000, cacheTtlMs: 10 * 60_000 }
        : env === "staging"
          ? { dailyTokenLimit: 30_000, perRequestTokenCap: 4_000, cacheTtlMs: 5 * 60_000 }
          : { dailyTokenLimit: 10_000, perRequestTokenCap: 2_000, cacheTtlMs: 60_000 },
    analyticsSampleRate: env === "production" ? 1 : env === "staging" ? 0.5 : 0,
    perfSampleRate: env === "production" ? 0.1 : 1,
  };
  return cached;
}

export function getAppEnv(): AppEnv {
  return getEnvConfig().env;
}