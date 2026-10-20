import { supabase } from "./supabaseClient";

/**
 * Recordatorios diarios por Web Push. La app NO programa nada: el servidor
 * (Edge Function `send-reminders`, con cron) envía el push a la hora local del
 * usuario, aunque la app esté cerrada. Aquí solo se gestiona el permiso y la
 * suscripción del dispositivo.
 */

export type NotificationPermission = "granted" | "denied" | "default";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (!pushSupported()) return "denied";
  return Notification.permission;
}

async function requestPermission(): Promise<NotificationPermission> {
  if (!pushSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Suscribe este dispositivo a push y guarda la suscripción del usuario. */
export async function subscribeToPush(userId: string): Promise<NotificationPermission> {
  if (!VAPID_PUBLIC_KEY) throw new Error("Falta VITE_VAPID_PUBLIC_KEY en la configuración.");
  const permission = await requestPermission();
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
  return permission;
}

/** Quita la suscripción de este dispositivo (solo este, no las del resto). */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}
