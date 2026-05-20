/**
 * AI cost governance: token budgeting, daily caps, and a lightweight
 * fallback gate. Pair with `aiCachedRun` for semantic deduplication.
 */

import { getEnvConfig } from "./env-config";
import { isFeatureEnabled } from "./feature-flags";
import { recordEvent } from "./monitoring";

const STORAGE_KEY = "aura:ai-budget:v1";

type BudgetState = { dayKey: string; tokens: number; requests: number };

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function load(): BudgetState {
  if (typeof localStorage === "undefined") {
    return { dayKey: todayKey(), tokens: 0, requests: 0 };
  }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || raw.dayKey !== todayKey()) {
      return { dayKey: todayKey(), tokens: 0, requests: 0 };
    }
    return raw;
  } catch {
    return { dayKey: todayKey(), tokens: 0, requests: 0 };
  }
}

function save(state: BudgetState) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* swallow */
  }
}

export type BudgetDecision =
  | { allowed: true; mode: "normal" | "lightweight" }
  | { allowed: false; reason: string };

export function decideAiRequest(estimatedTokens: number): BudgetDecision {
  const cfg = getEnvConfig();
  const cap = cfg.aiBudget.perRequestTokenCap;
  if (estimatedTokens > cap) {
    recordEvent("ai_request", "budget_capped", estimatedTokens);
    return { allowed: true, mode: "lightweight" };
  }
  const state = load();
  if (state.tokens + estimatedTokens > cfg.aiBudget.dailyTokenLimit) {
    if (isFeatureEnabled("ai_cost_strict")) {
      recordEvent("ai_request", "budget_blocked", state.tokens);
      return { allowed: false, reason: "Daily AI budget reached." };
    }
    return { allowed: true, mode: "lightweight" };
  }
  return { allowed: true, mode: "normal" };
}

export function recordAiUsage(tokens: number) {
  const state = load();
  state.tokens += Math.max(0, tokens);
  state.requests += 1;
  save(state);
}

export function getBudgetSnapshot() {
  const cfg = getEnvConfig();
  const state = load();
  return {
    dayKey: state.dayKey,
    tokensUsed: state.tokens,
    tokensLimit: cfg.aiBudget.dailyTokenLimit,
    requests: state.requests,
    remaining: Math.max(0, cfg.aiBudget.dailyTokenLimit - state.tokens),
    percent: Math.min(100, (state.tokens / cfg.aiBudget.dailyTokenLimit) * 100),
  };
}

export function resetBudget() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}