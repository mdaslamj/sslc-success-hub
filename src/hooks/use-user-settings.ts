/**
 * Loads and persists the signed-in user's UserSettingsDoc.
 * Falls back to defaults for guest browsing so settings UI is always renderable.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  defaultUserSettings,
  fetchUserSettings,
  upsertUserSettings,
} from "@/integrations/firebase/services/users";
import type { UserSettingsDoc } from "@/integrations/firebase/types";

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettingsDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (!user) {
        if (active) {
          setSettings(defaultUserSettings("guest"));
          setLoading(false);
        }
        return;
      }
      try {
        const s = (await fetchUserSettings(user.uid)) ?? defaultUserSettings(user.uid);
        if (active) setSettings(s);
      } catch (err) {
        console.error("fetchUserSettings", err);
        if (active) setSettings(defaultUserSettings(user.uid));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const update = useCallback(
    async (patch: Partial<UserSettingsDoc>) => {
      if (!settings) return;
      const next: UserSettingsDoc = {
        ...settings,
        ...patch,
        notifications: { ...settings.notifications, ...(patch.notifications ?? {}) },
        studyWindow: { ...settings.studyWindow, ...(patch.studyWindow ?? {}) },
        reminders: { ...(settings.reminders ?? {}), ...(patch.reminders ?? {}) },
        focusTimer: {
          ...(settings.focusTimer ?? defaultUserSettings(settings.uid).focusTimer!),
          ...(patch.focusTimer ?? {}),
        },
        aiAssistant: {
          ...(settings.aiAssistant ?? defaultUserSettings(settings.uid).aiAssistant!),
          ...(patch.aiAssistant ?? {}),
        },
        updatedAt: Date.now(),
      };
      setSettings(next);
      if (user) {
        try {
          await upsertUserSettings(next);
        } catch (err) {
          console.error("upsertUserSettings", err);
        }
      }
    },
    [settings, user],
  );

  return { settings, loading, update };
}