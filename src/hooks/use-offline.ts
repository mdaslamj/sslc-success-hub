import { useCallback, useEffect, useState } from "react";
import {
  bindConnectivity,
  enqueue,
  getStatus,
  isOnline,
  QueueItem,
  QueueKind,
  readLightweight,
  readQueue,
  refreshPending,
  runSync,
  subscribeSync,
  SyncStatus,
  toggleLightweight,
  type LightweightSettings,
} from "@/lib/offline";

/**
 * Default queue processor — replace with a real network handler at the
 * call site. The fallback simulates a network round-trip so guest mode
 * still drains the queue and shows recovery UX.
 */
async function defaultProcessor(item: QueueItem): Promise<void> {
  await new Promise((r) => setTimeout(r, 120));
  if (!isOnline()) throw new Error("offline");
  // No-op success — actual feature hooks register their own processors.
  void item;
}

export interface UseOfflineApi {
  status: SyncStatus;
  queue: QueueItem[];
  lightweight: LightweightSettings;
  enqueueWrite: <T>(kind: QueueKind, payload: T) => Promise<void>;
  syncNow: () => Promise<void>;
  setLightweight: (enabled: boolean) => Promise<void>;
}

export function useOffline(processor: (item: QueueItem) => Promise<void> = defaultProcessor): UseOfflineApi {
  const [status, setStatus] = useState<SyncStatus>(getStatus());
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lightweight, setLightweightState] = useState<LightweightSettings>({
    enabled: false,
    reduceMotion: false,
    compressImages: false,
    lowDataAi: false,
  });

  // Hydrate queue + lightweight settings on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [q, lw] = await Promise.all([readQueue(), readLightweight()]);
      if (cancelled) return;
      setQueue(q);
      setLightweightState(lw);
      await refreshPending();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to sync status changes.
  useEffect(() => subscribeSync(setStatus), []);

  // Auto-sync when connectivity returns.
  useEffect(() => {
    const unbind = bindConnectivity(async (online) => {
      if (online) {
        await runSync(processor);
        setQueue(await readQueue());
      }
    });
    return unbind;
  }, [processor]);

  const enqueueWrite = useCallback(
    async <T,>(kind: QueueKind, payload: T) => {
      await enqueue(kind, payload);
      setQueue(await readQueue());
      await refreshPending();
      if (isOnline()) {
        await runSync(processor);
        setQueue(await readQueue());
      }
    },
    [processor],
  );

  const syncNow = useCallback(async () => {
    await runSync(processor);
    setQueue(await readQueue());
  }, [processor]);

  const setLightweight = useCallback(async (enabled: boolean) => {
    const next = await toggleLightweight(enabled);
    setLightweightState(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.lightweight = next.enabled ? "true" : "false";
    }
  }, []);

  return { status, queue, lightweight, enqueueWrite, syncNow, setLightweight };
}