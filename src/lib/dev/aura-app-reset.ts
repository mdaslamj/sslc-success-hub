/**
 * Centralized Aura app-state reset and startup cache recovery.
 *
 * Clears only Aura-scoped localStorage, sessionStorage, IndexedDB, Cache API,
 * and service workers. Does not sign the user out of Firebase Auth.
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  AURA_CACHE_VERSION,
  AURA_CACHE_VERSION_KEY,
  AURA_INDEXED_DB_NAMES,
  AURA_RESET_PRESERVE_KEYS,
  isAuraLocalStorageKey,
  isAuraSessionStorageKey,
  type AuraStorageSweepResult,
} from "@/lib/dev/aura-cache-registry";
import { PROFILE_STORAGE_KEY } from "@/hooks/useStudentProfile";

export type ResetAuraAppStateOptions = {
  /** Clear TanStack Query in-memory cache when provided. */
  queryClient?: QueryClient | null;
  /** Hard reload after cleanup (recommended for dev reset). */
  reload?: boolean;
  /** Reload target — defaults to current origin + `/`. */
  reloadTo?: string;
  /** Keep theme/accent preferences (vidyapath:theme, vidyapath:accent). */
  preserveTheme?: boolean;
  /** Unregister service workers and clear Cache API buckets. */
  clearServiceWorkers?: boolean;
};

export type AuraStartupRecoveryReport = {
  versionChanged: boolean;
  previousVersion: string | null;
  corruptedKeysRemoved: string[];
  storageSweep?: AuraStorageSweepResult;
};

const THEME_KEYS = new Set(["vidyapath:theme", "vidyapath:accent"]);

function shouldPreserveKey(key: string, preserveTheme: boolean): boolean {
  if (AURA_RESET_PRESERVE_KEYS.has(key)) return true;
  if (preserveTheme && THEME_KEYS.has(key)) return true;
  return false;
}

export function sweepAuraLocalStorage(options?: {
  preserveTheme?: boolean;
}): AuraStorageSweepResult {
  const preserveTheme = options?.preserveTheme ?? false;
  const result: AuraStorageSweepResult = {
    localStorageRemoved: 0,
    sessionStorageRemoved: 0,
    preservedKeys: [],
  };

  if (typeof localStorage === "undefined") return result;

  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isAuraLocalStorageKey(key)) continue;
    if (shouldPreserveKey(key, preserveTheme)) {
      result.preservedKeys.push(key);
      continue;
    }
    toRemove.push(key);
  }

  for (const key of toRemove) {
    try {
      localStorage.removeItem(key);
      result.localStorageRemoved += 1;
    } catch {
      /* ignore quota/security errors */
    }
  }

  return result;
}

export function sweepAuraSessionStorage(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key || !isAuraSessionStorageKey(key)) continue;
    toRemove.push(key);
  }
  for (const key of toRemove) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  return toRemove.length;
}

export async function clearAuraIndexedDB(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await Promise.all(
    AURA_INDEXED_DB_NAMES.map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          } catch {
            resolve();
          }
        }),
    ),
  );
}

export async function clearAuraCacheStorage(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  let removed = 0;
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      if (!/aura|vidyapath|sslc|lovable/i.test(key)) continue;
      const ok = await caches.delete(key);
      if (ok) removed += 1;
    }
  } catch {
    /* ignore */
  }
  return removed;
}

export async function unregisterAuraServiceWorkers(): Promise<number> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return 0;
  let removed = 0;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const ok = await reg.unregister();
      if (ok) removed += 1;
    }
  } catch {
    /* ignore */
  }
  return removed;
}

/** Detect and remove corrupted JSON blobs that break hydration. */
export function repairCorruptedAuraStorage(): string[] {
  const removed: string[] = [];
  if (typeof localStorage === "undefined") return removed;

  const jsonKeys = [PROFILE_STORAGE_KEY, "aura.guest.onboarding.v1"];
  for (const key of jsonKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      JSON.parse(raw);
    } catch {
      try {
        localStorage.removeItem(key);
        removed.push(key);
      } catch {
        /* ignore */
      }
    }
  }

  return removed;
}

export function readAuraCacheVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(AURA_CACHE_VERSION_KEY);
  } catch {
    return null;
  }
}

export function writeAuraCacheVersion(version: string = AURA_CACHE_VERSION): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AURA_CACHE_VERSION_KEY, version);
  } catch {
    /* ignore */
  }
}

/**
 * Run on app boot: invalidate stale caches when version changes and repair
 * corrupted structures without requiring a full page reload.
 */
export function runAuraStartupRecovery(): AuraStartupRecoveryReport {
  const report: AuraStartupRecoveryReport = {
    versionChanged: false,
    previousVersion: readAuraCacheVersion(),
    corruptedKeysRemoved: repairCorruptedAuraStorage(),
  };

  if (report.previousVersion !== AURA_CACHE_VERSION) {
    report.versionChanged = true;
    report.storageSweep = sweepAuraLocalStorage({ preserveTheme: true });
    report.corruptedKeysRemoved = [
      ...report.corruptedKeysRemoved,
      ...repairCorruptedAuraStorage(),
    ];
    void clearAuraIndexedDB();
    void clearAuraCacheStorage();
    writeAuraCacheVersion(AURA_CACHE_VERSION);
  } else if (report.corruptedKeysRemoved.length > 0) {
    writeAuraCacheVersion(AURA_CACHE_VERSION);
  }

  if (import.meta.env.DEV && (report.versionChanged || report.corruptedKeysRemoved.length > 0)) {
    console.info("[aura] startup cache recovery", report);
  }

  return report;
}

/**
 * Developer reset — clears Aura caches and reloads the app cleanly.
 */
export async function resetAuraAppState(
  options: ResetAuraAppStateOptions = {},
): Promise<AuraStorageSweepResult & { indexedDBCleared: boolean; cachesCleared: number; serviceWorkersUnregistered: number }> {
  const preserveTheme = options.preserveTheme ?? false;
  const clearServiceWorkers = options.clearServiceWorkers ?? true;

  options.queryClient?.clear();

  const storageSweep = sweepAuraLocalStorage({ preserveTheme });
  storageSweep.sessionStorageRemoved = sweepAuraSessionStorage();

  await clearAuraIndexedDB();
  const cachesCleared = await clearAuraCacheStorage();
  const serviceWorkersUnregistered = clearServiceWorkers
    ? await unregisterAuraServiceWorkers()
    : 0;

  writeAuraCacheVersion(AURA_CACHE_VERSION);

  if (import.meta.env.DEV) {
    console.info("[aura] resetAuraAppState complete", {
      ...storageSweep,
      cachesCleared,
      serviceWorkersUnregistered,
    });
  }

  if (options.reload !== false && typeof window !== "undefined") {
    window.location.href = options.reloadTo ?? "/";
  }

  return {
    ...storageSweep,
    indexedDBCleared: true,
    cachesCleared,
    serviceWorkersUnregistered,
  };
}

declare global {
  interface Window {
    __resetAura?: () => Promise<unknown>;
    __auraCacheVersion?: string;
  }
}

/** Expose dev console helpers. */
export function installAuraDevGlobals(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  window.__resetAura = () => resetAuraAppState({ reload: true });
  window.__auraCacheVersion = AURA_CACHE_VERSION;
}
