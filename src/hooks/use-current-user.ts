import { useEffect, useState } from "react";

const KEY = "vidyapath.uid.v1";

/** Stable per-device anonymous user id, persisted in localStorage.
 *  Swap with Firebase Auth uid once auth lands — keep the hook signature. */
export function useCurrentUserId(): string {
  const [uid, setUid] = useState<string>("anon");
  useEffect(() => {
    try {
      let id = localStorage.getItem(KEY);
      if (!id) {
        id = `local_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
        localStorage.setItem(KEY, id);
      }
      setUid(id);
    } catch {
      setUid("anon");
    }
  }, []);
  return uid;
}