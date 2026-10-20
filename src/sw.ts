/// <reference lib="webworker" />
/**
 * Service worker de Babelito (compilado por vite-plugin-pwa, estrategia injectManifest).
 *  - Precache del build: la app abre sin conexión después de la primera visita.
 *  - push: muestra el recordatorio que envía el servidor (send-reminders).
 *  - notificationclick: enfoca la app abierta o abre la ruta del push.
 *
 * Nota: `self.__WB_MANIFEST` lo reemplaza el plugin en el build.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { createHandlerBoundToURL } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

self.skipWaiting();
self.addEventListener("activate", () => {
  void self.clients.claim();
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Navegación SPA: cualquier ruta sin conexión devuelve el index precacheado.
try {
  registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));
} catch {
  // En dev el index no está precacheado; no hace falta.
}

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Babelito", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "babelito-daily",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            void client.navigate(target).catch(() => undefined);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
      .catch((err) => console.warn("[SW] notificationclick error:", err))
  );
});
