/**
 * Play Store-compliant account deletion + data export workflow.
 * Performs a best-effort local purge immediately and queues a
 * server-side deletion request the operator can fulfil.
 */

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