import { useEffect, useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";

const KEY = "vidyapath.uid.v1";

/** Returns the current user id.
 *  - When signed in via Firebase Auth, returns the auth uid.
 *  - Otherwise falls back to a stable per-device id so local-first
 *    features keep working before the user signs in. */
export function useCurrentUserId(): string {
  const authCtx = useAuthOptional();
  const [localId, setLocalId] = useState<string>("anon");

  useEffect(() => {
    try {
      let id = localStorage.getItem(KEY);
      if (!id) {
        id = `local_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
        localStorage.setItem(KEY, id);
      }
      setLocalId(id);
    } catch {
      setLocalId("anon");
    }
  }, []);

  return authCtx?.user?.uid ?? localId;
}