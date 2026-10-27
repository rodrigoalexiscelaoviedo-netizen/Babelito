import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { initMonitoring, Sentry } from "./lib/monitoring";
import "./i18n";
import "@fontsource/bricolage-grotesque/latin-400.css";
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./index.css";

initMonitoring();

// El service worker atiende los push de recordatorio y los clicks en notificaciones.
// Solo en producción: en desarrollo vite-plugin-pwa no genera /sw.js.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Si ya había una versión controlando la página y llega una nueva, recarga
  // una vez: así cada publicación se ve al abrir la app, no recién a la segunda.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  navigator.serviceWorker.register("/sw.js").catch((err) => {
    console.warn("[SW] Registration failed:", err);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Sentry.ErrorBoundary
        fallback={<div className="min-h-screen grid place-items-center p-6 text-center text-paper-muted">Algo salió mal. Recarga la página.</div>}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </Sentry.ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
