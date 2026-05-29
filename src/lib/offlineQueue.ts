import type { AuraProfileStorage } from "@/hooks/useStudentProfile";

const QUEUE_KEY = "aura_offline_queue";

export type OfflineProfileSyncItem = {
  id: string;
  type: "profile_sync";
  stored: AuraProfileStorage;
  updatedAt: string;
  createdAt: string;
};

export type OfflineQueueItem = OfflineProfileSyncItem;

function readQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* storage full — drop oldest */
  }
}

export function queueOfflineWrite(
  data: Pick<OfflineProfileSyncItem, "type" | "stored" | "updatedAt">,
): void {
  try {
    const withoutProfile = readQueue().filter((item) => item.type !== "profile_sync");
    const entry: OfflineProfileSyncItem = {
      id: `profile_${Date.now()}`,
      type: "profile_sync",
      stored: data.stored,
      updatedAt: data.updatedAt,
      createdAt: new Date().toISOString(),
    };
    writeQueue([...withoutProfile, entry]);
  } catch {
    /* ignore */
  }
}

export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, failed: 0 };
  }

  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === "profile_sync") {
        const { syncProfileToFirestore } = await import("@/hooks/useStudentProfile");
        await syncProfileToFirestore(item.stored, item.updatedAt);
        flushed++;
      }
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, failed };
}
