/**
 * Exponential-backoff retry with jitter, plus a tiny online/offline helper.
 * Use for transient Firestore / fetch failures: only retries network-like
 * errors and never retries permission-denied / not-found.
 */

type RetryOpts = {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
};

const DEFAULT_RETRIES = 3;

function isRetryable(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (!code) return true;
  // Firestore non-retryable error codes.
  return ![
    "permission-denied",
    "not-found",
    "already-exists",
    "invalid-argument",
    "unauthenticated",
    "failed-precondition",
  ].includes(code);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const baseMs = opts.baseMs ?? 250;
  const maxMs = opts.maxMs ?? 4000;
  const shouldRetry = opts.shouldRetry ?? ((e) => isRetryable(e));

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) throw new Error("Aborted");
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err, attempt)) break;
      const delay = Math.min(maxMs, baseMs * 2 ** attempt);
      const jitter = Math.random() * delay * 0.25;
      await sleep(delay + jitter);
    }
  }
  throw lastErr;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Subscribe to online/offline transitions. Returns an unsubscribe fn. */
export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online", on);
  window.addEventListener("offline", off);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", off);
  };
}

/** Run `fn` and return a default value if it throws. Logs to monitoring. */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  label?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (label && typeof console !== "undefined") {
      console.warn(`[safeAsync:${label}]`, err);
    }
    return fallback;
  }
}