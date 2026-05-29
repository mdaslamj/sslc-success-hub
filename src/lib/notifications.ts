import { doc, setDoc } from "firebase/firestore";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { toast } from "sonner";
import { db, firebaseApp } from "@/integrations/firebase/config";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";
const FCM_SW_PATH = "/firebase-messaging-sw.js";
const DAILY_REMINDER_KEY = "aura.daily_reminder.sent.v1";
const REVISION_REMINDER_KEY = "aura.revision_reminder.sent.v1";

export type NotificationPreferences = {
  dailyDigest?: boolean;
  revisionReminders?: boolean;
  plannerAlerts?: boolean;
  studyReminderTime?: string;
  revisionReminderTime?: string;
  timezone?: string;
};

let messagingInstance: Messaging | null = null;
let foregroundListenerAttached = false;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!VAPID_KEY) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance ??= getMessaging(firebaseApp);
    return messagingInstance;
  } catch (err) {
    console.error("FCM support check error:", err);
    return null;
  }
}

async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(FCM_SW_PATH);
  } catch (err) {
    console.error("FCM SW registration error:", err);
    return null;
  }
}

function showInAppToast(title: string, body: string) {
  toast(title, { description: body || undefined });
}

export function showBrowserNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data,
    });
  } catch {
    /* Notification API unavailable */
  }
}

export async function requestNotificationPermission(
  userId: string,
  prefs?: NotificationPreferences,
): Promise<boolean> {
  try {
    if (typeof Notification === "undefined") return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const messaging = await getMessagingInstance();
    if (!messaging) return false;

    const registration = await registerMessagingServiceWorker();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration ?? undefined,
    });

    if (!token) return false;

    await setDoc(
      doc(db, "fcm_tokens", userId),
      {
        token,
        updatedAt: new Date().toISOString(),
        preferences: {
          dailyDigest: prefs?.dailyDigest ?? true,
          revisionReminders: prefs?.revisionReminders ?? true,
          plannerAlerts: prefs?.plannerAlerts ?? true,
          studyReminderTime: prefs?.studyReminderTime ?? "18:00",
          revisionReminderTime: prefs?.revisionReminderTime ?? "20:30",
          timezone: prefs?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.error("FCM token error:", err);
    return false;
  }
}

export async function syncNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<void> {
  try {
    await setDoc(
      doc(db, "fcm_tokens", userId),
      {
        updatedAt: new Date().toISOString(),
        preferences: {
          dailyDigest: prefs.dailyDigest ?? true,
          revisionReminders: prefs.revisionReminders ?? true,
          plannerAlerts: prefs.plannerAlerts ?? true,
          studyReminderTime: prefs.studyReminderTime ?? "18:00",
          revisionReminderTime: prefs.revisionReminderTime ?? "20:30",
          timezone: prefs.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      { merge: true },
    );
  } catch (err) {
    console.error("FCM preference sync error:", err);
  }
}

export function setupForegroundNotifications() {
  if (foregroundListenerAttached || typeof window === "undefined") return;
  foregroundListenerAttached = true;

  void (async () => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {};
        if (title) {
          showInAppToast(title, body ?? "");
        }
      });
    } catch (err) {
      console.error("FCM foreground setup error:", err);
    }
  })();
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchesReminderTime(now: Date, time?: string): boolean {
  if (!time) return false;
  const [hour, minute] = time.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
  return now.getHours() === hour && now.getMinutes() === minute;
}

function reminderAlreadySent(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === todayKey();
  } catch {
    return false;
  }
}

function markReminderSent(storageKey: string) {
  try {
    localStorage.setItem(storageKey, todayKey());
  } catch {
    /* storage unavailable */
  }
}

export function notifyEvaluationComplete(params: {
  subject: string;
  scoredMarks: number;
  totalMarks: number;
  grade: string;
}) {
  const title = "Evaluation complete";
  const body = `${params.subject}: ${params.scoredMarks}/${params.totalMarks} (${params.grade}). Tap to review feedback.`;
  showInAppToast(title, body);
  showBrowserNotification(title, body, { route: "/evaluate/results" });
}

export function startDailyReminderScheduler(prefs: NotificationPreferences): () => void {
  if (typeof window === "undefined") return () => {};

  const tick = () => {
    const now = new Date();

    if (
      prefs.dailyDigest &&
      matchesReminderTime(now, prefs.studyReminderTime) &&
      !reminderAlreadySent(DAILY_REMINDER_KEY)
    ) {
      const title = "Time for today's session";
      const body = "Your study plan is ready. A focused session keeps your streak alive.";
      showInAppToast(title, body);
      showBrowserNotification(title, body, { route: "/planner" });
      markReminderSent(DAILY_REMINDER_KEY);
    }

    if (
      prefs.revisionReminders &&
      matchesReminderTime(now, prefs.revisionReminderTime) &&
      !reminderAlreadySent(REVISION_REMINDER_KEY)
    ) {
      const title = "Revision reminder";
      const body = "Quick revision now beats cramming later. Open Aura to review weak topics.";
      showInAppToast(title, body);
      showBrowserNotification(title, body, { route: "/planner" });
      markReminderSent(REVISION_REMINDER_KEY);
    }
  };

  tick();
  const intervalId = window.setInterval(tick, 60_000);
  return () => window.clearInterval(intervalId);
}
