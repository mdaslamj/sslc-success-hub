import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Server-side admin gate. The access code is compared against a
 * non-`VITE_` env var so it never reaches the client bundle, and the
 * unlocked state lives in an encrypted, HttpOnly session cookie instead
 * of `sessionStorage` (which any visitor can flip from DevTools).
 *
 * Required runtime secrets:
 *   - ADMIN_ACCESS_CODE  — the shared admin pass-phrase
 *   - ADMIN_SESSION_SECRET — >=32 char random string for cookie encryption
 */

type AdminSession = { unlocked?: boolean; unlockedAt?: number };

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not configured (must be >= 32 chars).",
    );
  }
  return {
    password,
    name: "vp.admin",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

/** Constant-time string comparison to avoid trivial timing oracles. */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Read-only check: is the current session unlocked? Safe to call anywhere. */
export const checkAdminUnlocked = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!process.env.ADMIN_ACCESS_CODE || !process.env.ADMIN_SESSION_SECRET) {
      return { unlocked: false, enabled: false as const };
    }
    try {
      const session = await useSession<AdminSession>(sessionConfig());
      return { unlocked: Boolean(session.data.unlocked), enabled: true as const };
    } catch {
      return { unlocked: false, enabled: false as const };
    }
  },
);

/** Validate the submitted code and set the encrypted session cookie. */
export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(1).max(256),
    }),
  )
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_ACCESS_CODE;
    if (!expected || !process.env.ADMIN_SESSION_SECRET) {
      return { ok: false as const, enabled: false as const };
    }
    // Compare in constant time, then update the encrypted session.
    const ok = timingSafeEqual(data.code, expected);
    if (!ok) {
      // Small artificial delay to slow brute force.
      await new Promise((r) => setTimeout(r, 250));
      return { ok: false as const, enabled: true as const };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ unlocked: true, unlockedAt: Date.now() });
    return { ok: true as const, enabled: true as const };
  });

/** Clear the admin session cookie. */
export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const session = await useSession<AdminSession>(sessionConfig());
    await session.clear();
  } catch {
    /* no-op if not configured */
  }
  return { ok: true as const };
});