/**
 * In-memory TTL cache + in-flight request deduplication for Firestore
 * (and any other) async reads. Use this to:
 *   - Reduce unnecessary reads (repeated calls within TTL return cached data)
 *   - Prevent query duplication (parallel callers share the same promise)
 *   - Normalize repeated lookups across hooks / components
 *
 * Not a replacement for React Query — wrap *services*, not hooks.
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  // FIFO eviction — Map preserves insertion order.
  const overflow = store.size - MAX_ENTRIES;
  let i = 0;
  for (const k of store.keys()) {
    if (i++ >= overflow) break;
    store.delete(k);
  }
}

export function getCached<T>(key: string): T | undefined {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

export function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  evictIfNeeded();
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

/**
 * Wrap an async read. Returns the cached value within TTL; otherwise
 * dedups concurrent callers onto a single in-flight promise.
 */
export async function cachedRead<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== undefined) return cached;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await fn();
      setCached(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}