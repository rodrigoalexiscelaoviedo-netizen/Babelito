import { supabase } from "./supabaseClient";

export type NotificationPermission = "granted" | "denied" | "default";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

/**
 * If the current time matches the user's notification_time and today hasn't been notified yet,
 * shows a browser notification and marks notification_sent_today=true in the profile.
 */
export async function scheduleNotification(userId: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_time, notification_sent_today")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.notification_time) return;
    if (profile.notification_sent_today) return;

    const now = new Date();
    const [hh, mm] = (profile.notification_time as string).split(":").map(Number);
    const targetH = hh;
    const targetM = mm;

    // Fire if current time is within the same minute as notification_time
    if (now.getHours() !== targetH || now.getMinutes() !== targetM) return;

    const notification = new Notification("Babelito 🇬🇧", {
      body: "Time for your daily English practice! A few minutes is all you need.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "babelito-daily",
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = "/";
      notification.close();
    };

    // Mark as sent today
    await supabase
      .from("profiles")
      .update({ notification_sent_today: true })
      .eq("id", userId);
  } catch (err) {
    console.warn("[Babelito notifications] Error:", err);
  }
}

/**
 * Resets notification_sent_today at midnight.
 * Call this once on app load.
 */
export async function resetDailyNotificationFlag(userId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_sent_today, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.notification_sent_today) return;

    const lastUpdate = profile.updated_at ? new Date(profile.updated_at) : null;
    const today = new Date().toDateString();
    if (lastUpdate && lastUpdate.toDateString() !== today) {
      await supabase
        .from("profiles")
        .update({ notification_sent_today: false })
        .eq("id", userId);
    }
  } catch (err) {
    console.warn("[Babelito notifications] Reset error:", err);
  }
}
