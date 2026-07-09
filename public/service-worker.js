// Babelito Service Worker
// Handles notification clicks to open the app.
// Note: push scheduling is done from the main thread (notifications.ts + setInterval in App.tsx).

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If app is already open, focus it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window at the dashboard
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
      .catch((err) => {
        console.warn("[SW] notificationclick error:", err);
      })
  );
});
