/**
 * Durable retry queue for offline writes (scans, uploads, XP, analytics,
 * planner updates). Items persist via offlineSet so a reload or crash
 * never loses a student's submission.
 */
import { offlineGet, offlineSet } from "./storage";

export type QueueKind =
  | "scan"
  | "upload"
  | "xp"
  | "streak"
  | "analytics"
  | "planner"
  | "tutoring"
  | "mission"
  | "generic";

export interface QueueItem<T = unknown> {
  id: string;
  kind: QueueKind;
  payload: T;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const QUEUE_KEY = "sync-queue";

export async function readQueue(): Promise<QueueItem[]> {
  return (await offlineGet<QueueItem[]>(QUEUE_KEY)) ?? [];
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  await offlineSet(QUEUE_KEY, items);
}

export async function enqueue<T>(kind: QueueKind, payload: T): Promise<QueueItem<T>> {
  const item: QueueItem<T> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  const queue = await readQueue();
  queue.push(item as QueueItem);
  await writeQueue(queue);
  return item;
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.id !== id));
}

export async function markFailure(id: string, error: string): Promise<void> {
  const queue = await readQueue();
  const next = queue.map((q) =>
    q.id === id ? { ...q, attempts: q.attempts + 1, lastError: error } : q,
  );
  await writeQueue(next);
}

export type QueueProcessor = (item: QueueItem) => Promise<void>;

/**
 * Drain the queue. Each handler runs once per item; on success the item is
 * removed, on failure the attempt count grows and the item stays for the
 * next online tick. Items with >= MAX_ATTEMPTS are kept but skipped — never
 * silently deleted, so the student / parent can see preserved submissions.
 */
export const MAX_ATTEMPTS = 6;

export async function drainQueue(processor: QueueProcessor): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  const queue = await readQueue();
  let processed = 0;
  let failed = 0;
  for (const item of queue) {
    if (item.attempts >= MAX_ATTEMPTS) continue;
    try {
      await processor(item);
      await removeFromQueue(item.id);
      processed++;
    } catch (err) {
      failed++;
      await markFailure(item.id, err instanceof Error ? err.message : String(err));
    }
  }
  const remaining = (await readQueue()).length;
  return { processed, failed, remaining };
}