import { useNotifications } from "@/hooks/useNotifications";

/** Mounts FCM + reminder wiring without rendering UI. */
export function NotificationProvider() {
  useNotifications();
  return null;
}
