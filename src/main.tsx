import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { scheduleNotification } from "./lib/notifications";
import { supabase } from "./lib/supabaseClient";
import "./index.css";

// Register Service Worker for notification click handling
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((err) => {
    console.warn("[SW] Registration failed:", err);
  });
}

// Poll every 60 seconds: fire notification if it's the right time
setInterval(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await scheduleNotification(user.id);
  } catch {
    // silent — don't break the app
  }
}, 60_000);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
