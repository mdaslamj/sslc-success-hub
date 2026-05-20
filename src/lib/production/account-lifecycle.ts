/**
 * Play Store-compliant account deletion + data export workflow.
 *
 * On request we:
 *   1. Best-effort purge all of the user's Firestore documents
 *      (per-user subcollections under users/{uid} and known flat
 *       per-user docs).
 *   2. Delete the Firebase Auth credential so the account cannot
 *      sign back in.
 *   3. Wipe local cached data.
 *
 * Owner-gated Firestore rules guarantee that signed-in users can
 * delete their own documents without any service-account/admin SDK.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";

import { auth, db, COLLECTIONS } from "@/integrations/firebase/config";
import {
  ADAPTIVE_SUBCOLLECTIONS,
  BOARD_READINESS_SUBCOLLECTIONS,
  DIAGNOSIS_SUBCOLLECTIONS,
  EXAM_HALL_SUBCOLLECTIONS,
  GAMIFICATION_SUBCOLLECTIONS,
  LEARNING_MEMORY_SUBCOLLECTIONS,
  PARENT_SUBCOLLECTIONS,
  SEMANTIC_SUBCOLLECTIONS,
  VOICE_SUBCOLLECTIONS,
} from "@/integrations/firebase/config";
import { recordEvent } from "./monitoring";

const STORAGE_KEY = "aura:account-deletion-queue:v1";

export type DeletionRequest = {
  id: string;
  uid: string;
  email?: string;
  reason?: string;
  requestedAt: number;
  status: "pending" | "in_progress" | "completed";
};

function load(): DeletionRequest[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(reqs: DeletionRequest[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
  } catch {
    /* swallow */
  }
}

const PURGE_PREFIXES = [
  "aura:",
  "vidyapath:",
  "scan:",
  "planner:",
  "quiz:",
  "exam:",
  "voice:",
  "memory:",
  "gamification:",
];

export function purgeLocalUserData() {
  if (typeof localStorage === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (PURGE_PREFIXES.some((p) => k.startsWith(p))) toRemove.push(k);
  }
  for (const k of toRemove) localStorage.removeItem(k);
  recordEvent("info", "account_local_purge", toRemove.length);
}

export function requestAccountDeletion(input: {
  uid: string;
  email?: string;
  reason?: string;
}): DeletionRequest {
  const req: DeletionRequest = {
    id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    uid: input.uid,
    email: input.email,
    reason: input.reason,
    requestedAt: Date.now(),
    status: "pending",
  };
  const list = load();
  list.push(req);
  save(list);
  recordEvent("info", "account_deletion_requested");
  return req;
}

export function listDeletionRequests(): DeletionRequest[] {
  return load();
}

export function markDeletionStatus(id: string, status: DeletionRequest["status"]) {
  const list = load().map((r) => (r.id === id ? { ...r, status } : r));
  save(list);
}

export function exportLocalUserData(): Blob {
  const dump: Record<string, string> = {};
  if (typeof localStorage !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (PURGE_PREFIXES.some((p) => k.startsWith(p))) {
        dump[k] = localStorage.getItem(k) ?? "";
      }
    }
  }
  return new Blob([JSON.stringify(dump, null, 2)], {
    type: "application/json",
  });
}

// Every subcollection name we own under users/{uid}.
const USER_SUBCOLLECTIONS: readonly string[] = Array.from(
  new Set<string>([
    ...Object.values(DIAGNOSIS_SUBCOLLECTIONS),
    ...Object.values(ADAPTIVE_SUBCOLLECTIONS),
    ...Object.values(SEMANTIC_SUBCOLLECTIONS),
    ...Object.values(BOARD_READINESS_SUBCOLLECTIONS),
    ...Object.values(LEARNING_MEMORY_SUBCOLLECTIONS),
    ...Object.values(GAMIFICATION_SUBCOLLECTIONS),
    ...Object.values(VOICE_SUBCOLLECTIONS),
    ...Object.values(EXAM_HALL_SUBCOLLECTIONS),
    ...Object.values(PARENT_SUBCOLLECTIONS),
  ]),
);

// Flat top-level collections whose doc id == auth uid.
const FLAT_USER_DOC_COLLECTIONS: readonly string[] = [
  COLLECTIONS.USERS,
  COLLECTIONS.USER_PROFILES,
  COLLECTIONS.USER_SETTINGS,
  COLLECTIONS.USER_STATS,
  COLLECTIONS.PARENTS,
  COLLECTIONS.TEACHERS,
  COLLECTIONS.STREAKS,
];

async function deleteCollectionDocs(colPath: string) {
  try {
    const snap = await getDocs(collection(db, colPath));
    if (snap.empty) return;
    // Batch in chunks of 400 (Firestore cap is 500 writes per batch).
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  } catch (err) {
    // Permission denied / collection not owned — skip silently.
    console.warn(`[account-deletion] skip ${colPath}:`, err);
  }
}

/**
 * Best-effort purge of the signed-in user's Firestore data. Iterates
 * every per-user subcollection we know about plus flat docs keyed by
 * uid. Errors on individual collections are swallowed so one failure
 * doesn't abort the whole deletion.
 */
export async function purgeFirestoreUserData(uid: string): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  for (const sub of USER_SUBCOLLECTIONS) {
    tasks.push(deleteCollectionDocs(`${COLLECTIONS.USERS}/${uid}/${sub}`));
  }
  await Promise.all(tasks);
  for (const col of FLAT_USER_DOC_COLLECTIONS) {
    try {
      await deleteDoc(doc(db, col, uid));
    } catch (err) {
      console.warn(`[account-deletion] skip flat ${col}/${uid}:`, err);
    }
  }
  recordEvent("info", "account_firestore_purge", USER_SUBCOLLECTIONS.length);
}

export type AuthDeletionResult =
  | { ok: true }
  | { ok: false; reason: "requires-recent-login" | "no-user" | "unknown"; message: string };

/**
 * Deletes the current Firebase Auth credential. Returns a structured
 * result so the UI can prompt the user to re-authenticate when
 * Firebase requires a fresh token (recent-login requirement).
 */
export async function deleteFirebaseAuthAccount(): Promise<AuthDeletionResult> {
  const current = auth.currentUser;
  if (!current) {
    return { ok: false, reason: "no-user", message: "Not signed in." };
  }
  try {
    await deleteUser(current);
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/requires-recent-login") {
      return {
        ok: false,
        reason: "requires-recent-login",
        message:
          "For your safety, please sign in again and immediately retry the deletion.",
      };
    }
    return {
      ok: false,
      reason: "unknown",
      message: (err as Error)?.message ?? "Failed to delete account.",
    };
  }
}