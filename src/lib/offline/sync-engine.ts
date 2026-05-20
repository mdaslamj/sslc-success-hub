/**
 * Sync engine. Watches connectivity, drains the queue when the network
 * returns, and resolves conflicts using a "server wins for identity,
 * client wins for progress deltas" strategy (additive XP / streak counters
 * are always re-applied; identity fields like name / class are server-led).
 */
import { drainQueue, QueueItem, readQueue, QueueProcessor } from "./queue";

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export type SyncListener = (status: SyncStatus) => void;

let status: SyncStatus = {
  online: isOnline(),
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
};

const listeners = new Set<SyncListener>();

function emit() {
  for (const l of listeners) l(status);
}

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export async function refreshPending(): Promise<void> {
  const q = await readQueue();
  status = { ...status, pending: q.length };
  emit();
}

export async function runSync(processor: QueueProcessor): Promise<SyncStatus> {
  if (!isOnline() || status.syncing) {
    await refreshPending();
    return status;
  }
  status = { ...status, syncing: true, lastError: null };
  emit();
  try {
    const result = await drainQueue(processor);
    status = {
      ...status,
      syncing: false,
      pending: result.remaining,
      lastSyncedAt: Date.now(),
    };
  } catch (err) {
    status = {
      ...status,
      syncing: false,
      lastError: err instanceof Error ? err.message : String(err),
    };
  }
  emit();
  return status;
}

/** Merge a server snapshot with locally-queued additive deltas. */
export function resolveConflict<T extends Record<string, unknown>>(
  serverDoc: T,
  additiveKeys: (keyof T)[],
  localDeltas: Partial<Record<keyof T, number>>,
): T {
  const merged: T = { ...serverDoc };
  for (const key of additiveKeys) {
    const delta = localDeltas[key];
    if (typeof delta === "number" && typeof merged[key] === "number") {
      merged[key] = ((merged[key] as number) + delta) as T[typeof key];
    }
  }
  return merged;
}

/** Wire up window listeners. Returns an unsubscribe fn. */
export function bindConnectivity(onChange: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const up = () => {
    status = { ...status, online: true };
    emit();
    onChange(true);
  };
  const down = () => {
    status = { ...status, online: false };
    emit();
    onChange(false);
  };
  window.addEventListener("online", up);
  window.addEventListener("offline", down);
  return () => {
    window.removeEventListener("online", up);
    window.removeEventListener("offline", down);
  };
}

export function getStatus(): SyncStatus {
  return status;
}

export { type QueueItem };