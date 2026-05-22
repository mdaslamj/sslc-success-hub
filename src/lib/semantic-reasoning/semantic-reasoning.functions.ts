import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Server-only call to the Lovable AI Gateway (OpenAI-compatible /chat/completions).
 * Reads LOVABLE_API_KEY from the server runtime; never exposed to the client.
 *
 * This is the SINGLE entry point for the semantic reasoning layer. All
 * grounding (chapter, rubric, formulas, weakness, memory, OCR) is composed
 * client-side via `buildGroundingPrompt` and passed in as `grounding`.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

/**
 * Model allowlist. Prevents authenticated callers from requesting expensive
 * premium models (e.g. gpt-5-pro, claude-opus) and draining the project's
 * LOVABLE_API_KEY credits. Only cost-bounded Gemini Flash tiers are exposed.
 */
const ALLOWED_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash-image",
] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

/**
 * Firebase ID token verification. Prevents unauthenticated callers from
 * draining the project's LOVABLE_API_KEY credits by hitting this server
 * function directly. Verifies the JWT signature against Google's
 * securetoken JWKS, plus issuer/audience claims tied to the Firebase
 * project ID.
 */
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? "aura-57e48";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: FIREBASE_ISSUER,
    audience: FIREBASE_PROJECT_ID,
  });
  if (!payload.sub) throw new Error("Token missing subject");
  return payload.sub;
}

/**
 * Server-side response cache + dedup. Keyed by FNV-1a hash of the full
 * request body. Cuts duplicate token spend and gives instant replies when
 * the same prompt is retried within TTL. Bounded to MAX_ENTRIES (LRU-ish
 * FIFO eviction). All in-memory; resets on cold start.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
type CacheEntry = { value: SemanticReasoningResult; expiresAt: number };
const responseCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<SemanticReasoningResult>>();

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function cacheKey(parts: unknown): string {
  return fnv1a(JSON.stringify(parts));
}

function getCached(key: string): SemanticReasoningResult | undefined {
  const hit = responseCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    responseCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function setCached(key: string, value: SemanticReasoningResult) {
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (responseCache.size > CACHE_MAX) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
}

/**
 * Server-side per-user rate limiting. Enforces both a short-window burst
 * cap and a rolling 24h daily cap, so a single authenticated user cannot
 * drain the shared LOVABLE_API_KEY by clearing their browser localStorage
 * budget. In-memory only — resets on cold start, which is acceptable as a
 * defense-in-depth alongside the gateway's global rate limits.
 */
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const PER_USER_PER_MINUTE = Number(process.env.AI_PER_USER_PER_MINUTE ?? 20);
const PER_USER_PER_DAY = Number(process.env.AI_PER_USER_PER_DAY ?? 500);
const RATE_USERS_MAX = 5000;
type UserCounter = { minute: number[]; day: number[] };
const userCounters = new Map<string, UserCounter>();

function checkRateLimit(uid: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let entry = userCounters.get(uid);
  if (!entry) {
    entry = { minute: [], day: [] };
    userCounters.set(uid, entry);
    if (userCounters.size > RATE_USERS_MAX) {
      const first = userCounters.keys().next().value;
      if (first) userCounters.delete(first);
    }
  }
  entry.minute = entry.minute.filter((t) => now - t < MINUTE_MS);
  entry.day = entry.day.filter((t) => now - t < DAY_MS);
  if (entry.minute.length >= PER_USER_PER_MINUTE) {
    return { ok: false, retryAfterSec: 60 };
  }
  if (entry.day.length >= PER_USER_PER_DAY) {
    const oldest = entry.day[0] ?? now;
    return { ok: false, retryAfterSec: Math.ceil((DAY_MS - (now - oldest)) / 1000) };
  }
  entry.minute.push(now);
  entry.day.push(now);
  return { ok: true };
}

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const InputSchema = z.object({
  idToken: z.string().min(20).max(8000),
  model: z.enum(ALLOWED_MODELS).optional(),
  systemPrompt: z.string().min(1).max(8000),
  grounding: z.string().max(20000).optional(),
  messages: z.array(MessageSchema).min(1).max(40),
  responseFormat: z.enum(["text", "json_object"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type SemanticReasoningResult = {
  ok: true;
  model: string;
  content: string;
} | {
  ok: false;
  status: number;
  error: string;
};

export const runSemanticReasoning = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SemanticReasoningResult> => {
    // Auth gate — reject anonymous callers before spending credits.
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch (err) {
      console.error("[auth] token verification failed", err);
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    // Server-side per-user rate limit — authoritative cap that cannot be
    // bypassed by clearing client localStorage.
    const rate = checkRateLimit(uid);
    if (!rate.ok) {
      return {
        ok: false,
        status: 429,
        error: `Daily AI request limit reached. Try again in ${Math.ceil(rate.retryAfterSec / 60)} minute(s).`,
      };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, status: 500, error: "LOVABLE_API_KEY not configured" };
    }

    const model = data.model ?? DEFAULT_MODEL;
    const messages = [
      { role: "system" as const, content: data.systemPrompt },
      ...(data.grounding
        ? [{ role: "system" as const, content: `Grounding context:\n${data.grounding}` }]
        : []),
      ...data.messages,
    ];

    // Cache + dedup: hash the fully-resolved request so identical prompts
    // share results and don't burn tokens twice.
    const key = cacheKey({
      model,
      messages,
      responseFormat: data.responseFormat,
      temperature: data.temperature,
    });
    const cached = getCached(key);
    if (cached) return cached;
    const existing = inflight.get(key);
    if (existing) return existing;

    const run = async (): Promise<SemanticReasoningResult> => {
    let res: Response;
    try {
      res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: data.temperature ?? 0.4,
          ...(data.responseFormat === "json_object"
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: 502, error: `Gateway fetch failed: ${message}` };
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[semantic-reasoning] Gateway error ${res.status}: ${body.slice(0, 1000)}`,
      );
      if (res.status === 429) {
        return {
          ok: false,
          status: 429,
          error: "Rate limit exceeded. Please try again in a moment.",
        };
      }
      if (res.status === 402) {
        return {
          ok: false,
          status: 402,
          error:
            "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
        };
      }
      return {
        ok: false,
        status: res.status,
        error: "AI service error. Please try again.",
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { ok: true, model, content };
    };

    const promise = run()
      .then((result) => {
        if (result.ok) setCached(key, result);
        return result;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  });