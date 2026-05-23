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
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { deleteObject, listAll, ref as storageRef } from "firebase/storage";

import { auth, db, getStorageLazy, COLLECTIONS } from "@/integrations/firebase/config";
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

// Flat top-level collections whose docs carry a `userId` field referencing
// the owning user. We query+batch-delete matching docs for full account
// erasure (Play Store / GDPR compliance).
const FLAT_USERID_FIELD_COLLECTIONS: readonly string[] = [
  COLLECTIONS.NOTES,
  COLLECTIONS.CHAPTER_PROGRESS,
  COLLECTIONS.USER_PROGRESS,
  COLLECTIONS.STUDY_SESSIONS,
  COLLECTIONS.ANALYTICS,
  COLLECTIONS.QUIZ_ATTEMPTS,
  COLLECTIONS.STUDY_PLANS,
  COLLECTIONS.PLANNER_TASKS,
  COLLECTIONS.REVISION_SCHEDULES,
  COLLECTIONS.RECOMMENDATIONS,
  COLLECTIONS.AI_INSIGHTS,
  COLLECTIONS.EXAM_ATTEMPTS,
  COLLECTIONS.EXAM_RESULTS,
  COLLECTIONS.DAILY_PLANS,
  COLLECTIONS.DAILY_REFLECTIONS,
  COLLECTIONS.MOTIVATION_EVENTS,
  COLLECTIONS.WEAKNESS_REPORTS,
  COLLECTIONS.USER_ACHIEVEMENTS,
  COLLECTIONS.SESSION_RESULTS,
  COLLECTIONS.SESSION_FEEDBACK,
  COLLECTIONS.REVISION_TRIGGERS,
  COLLECTIONS.SCANS,
  COLLECTIONS.SOLVED_QUESTIONS,
  COLLECTIONS.AI_EVALUATIONS,
  COLLECTIONS.PRACTICE_RECOMMENDATIONS,
  COLLECTIONS.MATH_CHAPTER_ANALYTICS,
  COLLECTIONS.ANSWER_UPLOADS,
  COLLECTIONS.ANSWER_ATTEMPTS,
  COLLECTIONS.EVALUATIONS,
  COLLECTIONS.STUDENT_INVITES,
  COLLECTIONS.PARENT_LINKS,
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

async function deleteDocsWhereUserId(colName: string, uid: string) {
  try {
    const q = query(collection(db, colName), where("userId", "==", uid));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  } catch (err) {
    console.warn(`[account-deletion] skip flat-userId ${colName}:`, err);
  }
}

async function deleteStorageFolder(path: string) {
  try {
    const storage = await getStorageLazy();
    const dir = storageRef(storage, path);
    const listing = await listAll(dir);
    await Promise.all(listing.items.map((it) => deleteObject(it).catch(() => {})));
    // Recurse into subfolders.
    await Promise.all(
      listing.prefixes.map((p) => deleteStorageFolder(p.fullPath)),
    );
  } catch (err) {
    console.warn(`[account-deletion] skip storage ${path}:`, err);
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
  for (const col of FLAT_USERID_FIELD_COLLECTIONS) {
    tasks.push(deleteDocsWhereUserId(col, uid));
  }
  await Promise.all(tasks);
  for (const col of FLAT_USER_DOC_COLLECTIONS) {
    try {
      await deleteDoc(doc(db, col, uid));
    } catch (err) {
      console.warn(`[account-deletion] skip flat ${col}/${uid}:`, err);
    }
  }
  // Best-effort: delete handwritten-answer uploads stored under
  // answer-uploads/{uid}/ in Firebase Storage.
  await deleteStorageFolder(`answer-uploads/${uid}`);
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