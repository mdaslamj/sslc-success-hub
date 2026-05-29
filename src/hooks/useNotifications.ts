import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/hooks/use-user-settings";
import {
  requestNotificationPermission,
  setupForegroundNotifications,
  startDailyReminderScheduler,
  syncNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

function toPrefs(settings: NonNullable<ReturnType<typeof useUserSettings>["settings"]>): NotificationPreferences {
  return {
    dailyDigest: settings.notifications.dailyDigest,
    revisionReminders: settings.notifications.revisionReminders,
    plannerAlerts: settings.notifications.plannerAlerts ?? true,
    studyReminderTime: settings.reminders?.studyReminderTime ?? "18:00",
    revisionReminderTime: settings.reminders?.revisionReminderTime ?? "20:30",
  };
}

/**
 * Registers FCM, foreground message handling, and local daily reminder checks.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { settings } = useUserSettings();

  useEffect(() => {
    setupForegroundNotifications();
  }, []);

  useEffect(() => {
    if (!user || !settings) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const prefs = toPrefs(settings);
    void requestNotificationPermission(user.uid, prefs);
  }, [user, settings]);

  useEffect(() => {
    if (!user || !settings) return;
    const prefs = toPrefs(settings);
    void syncNotificationPreferences(user.uid, prefs);
  }, [user, settings]);

  useEffect(() => {
    if (!settings) return;
    return startDailyReminderScheduler(toPrefs(settings));
  }, [settings]);
}
