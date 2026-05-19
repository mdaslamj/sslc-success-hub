import { recordEvent } from "./monitoring";

/**
 * Semantic response cache + dedup for AI gateway calls. Keyed by a hash
 * of (model, systemPrompt, grounding, messages, responseFormat). Prevents
 * duplicate token spend when the same prompt is re-issued within TTL.
 */

type Entry<T> = { value: T; expiresAt: number };

const cache = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 200;

function evict() {
  if (cache.size <= MAX_ENTRIES) return;
  const overflow = cache.size - MAX_ENTRIES;
  let i = 0;
  for (const k of cache.keys()) {
    if (i++ >= overflow) break;
    cache.delete(k);
  }
}

/** Stable, fast non-crypto hash (FNV-1a 32-bit, hex string). */
function hashKey(input: unknown): string {
  const str = typeof input === "string" ? input : JSON.stringify(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

export function aiCacheKey(parts: {
  model?: string;
  systemPrompt: string;
  grounding?: string;
  messages: Array<{ role: string; content: string }>;
  responseFormat?: string;
}): string {
  return `ai:${hashKey(parts)}`;
}

export function getAiCached<T>(key: string): T | undefined {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

export function setAiCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  evict();
}

export function clearAiCache() {
  cache.clear();
}

/**
 * Run an AI request through cache + dedup. Records a cache hit/miss event
 * for diagnostics. Only successful results are cached.
 */
export async function aiCachedRun<T>(
  key: string,
  fn: () => Promise<T>,
  opts: { ttlMs?: number; isSuccess?: (v: T) => boolean } = {},
): Promise<T> {
  const cached = getAiCached<T>(key);
  if (cached !== undefined) {
    recordEvent("ai_response", "cache_hit", undefined, { key });
    return cached;
  }
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    recordEvent("ai_request", "dedup_join", undefined, { key });
    return existing;
  }
  recordEvent("ai_request", "cache_miss", undefined, { key });
  const promise = (async () => {
    try {
      const value = await fn();
      const ok = opts.isSuccess ? opts.isSuccess(value) : true;
      if (ok) setAiCached(key, value, opts.ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}