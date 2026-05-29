/* eslint-disable no-undef */
importScripts("/firebase-sw-config.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};

  self.registration.showNotification(title ?? "Aura", {
    body: body ?? "Time to study",
    icon: icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data,
    actions: [
      { action: "open", title: "Open Aura" },
      { action: "dismiss", title: "Later" },
    ],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "open" || !event.action) {
    const route = event.notification.data?.route ?? "/";
    event.waitUntil(clients.openWindow(route));
  }
});
