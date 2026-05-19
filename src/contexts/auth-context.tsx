/**
 * Global Firebase Auth context. Single source of truth for the current
 * user across the app. Wraps onAuthStateChanged and bootstraps the
 * user's profile/settings/stats docs on first sign-in.
 *
 * Backward-compat: `useCurrentUserId()` continues to work — see
 * src/hooks/use-current-user.ts — by reading uid from this context first
 * and falling back to the legacy localStorage id so existing local-first
 * features keep working before the user signs in.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/config";
import {
  ensureUserDocuments,
  fetchUserProfile,
} from "@/integrations/firebase/services/users";
import type { UserProfileDoc } from "@/integrations/firebase/types";

export type AuthContextValue = {
  user: FirebaseUser | null;
  profile: UserProfileDoc | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const p = await ensureUserDocuments({
          uid: u.uid,
          email: u.email ?? "",
          displayName: u.displayName,
          photoURL: u.photoURL,
        });
        setProfile(p);
      } catch (err) {
        console.error("Failed to bootstrap user docs", err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchUserProfile(user.uid);
    if (p) setProfile(p);
  }, [user]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName });
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : "https://sscl-guru-ai.lovable.app/login",
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** Optional variant — returns null instead of throwing. */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}