/**
 * Registry of Aura-scoped browser storage keys and cache namespaces.
 * Used by startup recovery and developer reset — never wipes unrelated data.
 */

/** Bump when incompatible cached structures change; triggers automatic invalidation. */
export const AURA_CACHE_VERSION = "v3";

export const AURA_CACHE_VERSION_KEY = "aura:cache-version";

/** IndexedDB database names owned by Aura. */
export const AURA_INDEXED_DB_NAMES = ["aura-offline"] as const;

/**
 * localStorage key prefixes — only keys matching these (or EXACT_KEYS) are cleared.
 */
export const AURA_LOCAL_STORAGE_PREFIXES = [
  "aura:",
  "aura.",
  "aura_",
  "vidyapath:",
  "vidyapath.",
  "exam:",
  "mt:",
  "chapter_",
  "v1_chapter_",
  "v2_chapter_",
  "v3_chapter_",
  "scan:",
  "planner:",
  "quiz:",
  "memory:",
  "gamification:",
] as const;

/** Exact localStorage keys (no prefix match needed). */
export const AURA_LOCAL_STORAGE_EXACT_KEYS = [
  "aura_profile",
  "aura_profile_version",
  "lightweight-mode",
] as const;

/** sessionStorage keys/prefixes owned by Aura (currently none persistent). */
export const AURA_SESSION_STORAGE_PREFIXES = ["aura:", "vidyapath:"] as const;

export function isAuraLocalStorageKey(key: string): boolean {
  if ((AURA_LOCAL_STORAGE_EXACT_KEYS as readonly string[]).includes(key)) return true;
  return AURA_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function isAuraSessionStorageKey(key: string): boolean {
  return AURA_SESSION_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Keys that should survive a dev reset (Firebase auth is separate). */
export const AURA_RESET_PRESERVE_KEYS = new Set<string>([
  AURA_CACHE_VERSION_KEY,
]);

export type AuraStorageSweepResult = {
  localStorageRemoved: number;
  sessionStorageRemoved: number;
  preservedKeys: string[];
};
