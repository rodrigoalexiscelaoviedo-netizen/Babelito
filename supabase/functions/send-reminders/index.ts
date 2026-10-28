/**
 * send-reminders — recordatorio diario por Web Push.
 *
 * Lo dispara pg_cron cada 15 minutos (ver docs/RECORDATORIOS.md). Para cada
 * usuario con notification_time, calcula la hora LOCAL de su timezone y, si
 * estamos dentro de los 15 minutos desde su hora y todavía no se envió hoy,
 * manda el push a todos sus dispositivos. Si la práctica del día ya está
 * completa, no molesta.
 *
 * El mensaje es inteligente (inglés): prioriza una racha en riesgo, luego los
 * repasos pendientes, luego una misión de Situaciones a medias; si no, uno
 * motivacional que rota por día.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (inyectados por Supabase),
 *          VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
 *
 * Pruebas: x-dry-run: 1 no envía nada. Con x-force: 1 (solo en dry-run) ignora
 * la ventana horaria y devuelve los textos que se enviarían (sin datos personales).
 */
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (name: string): string => (Deno.env.get(name) ?? "").trim();

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

let vapidReady = false;
/** Configura VAPID al primer uso. Devuelve un mensaje de error legible (sin secretos) o null. */
function ensureVapid(): string | null {
  if (vapidReady) return null;
  const missing = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"].filter((n) => !env(n));
  if (missing.length) return "Faltan secretos: " + missing.join(", ");
  try {
    webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:admin@babelito.app", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
    vapidReady = true;
    return null;
  } catch (err) {
    return "Clave VAPID inválida (revisá VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT): " + String(err instanceof Error ? err.message : err);
  }
}

const WINDOW_MINUTES = 15;

const COPY = {
  en: {
    title: "Babelito",
    lines: [
      "Your English is waiting. Five minutes is enough.",
      "A short chat today keeps your progress moving. 💪",
      "One conversation. Some XP. A better accent. Let's go.",
      "Your coach has a new question for you. 🎙️",
    ],
    streak: (n: number) => `Your ${n}-day streak is waiting. Five minutes keeps it alive. 🔥`,
  },
  ca: {
    title: "Babelito",
    lines: [
      "La teva pràctica d'avui t'espera. Cinc minuts són suficients. 💪",
    ],
    streak: (n: number) => `La teva ratxa de ${n} dies t'espera. 🔥`,
  },
} as const;

/** Días seguidos con práctica completa, contando desde ayer (hoy aún no cuenta). */
function streakFrom(completedDates: Set<string>, todayLocal: string): number {
  let n = 0;
  const cursor = new Date(todayLocal + "T12:00:00Z");
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    n++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return n;
}

/** Pasos hechos (de 4) de una misión de Situaciones. */
function stepsDone(steps: Record<string, unknown> | null): number {
  if (!steps) return 0;
  return (
    (steps.phrases === true ? 1 : 0) +
    (steps.dialogue === true ? 1 : 0) +
    (typeof steps.quiz === "number" && steps.quiz >= 60 ? 1 : 0) +
    (steps.roleplay === true ? 1 : 0)
  );
}

const prettify = (packId: string) => packId.replace(/-/g, " ");

/**
 * Elige el texto del recordatorio. Prioridad (inglés):
 *  1) racha de 3+ días en riesgo  2) 5+ repasos pendientes
 *  3) misión de Situaciones a medias  4) racha corta  5) frase que rota.
 */
async function smartBody(userId: string, lang: "en" | "ca", localDate: string, streak: number, dayOfYear: number): Promise<string> {
  const copy = COPY[lang];
  if (lang === "ca") return copy.lines[dayOfYear % copy.lines.length];

  if (streak >= 3) return copy.streak(streak);

  try {
    const { count } = await admin
      .from("review_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review", localDate)
      .or("language.eq.en,language.is.null");
    const due = count ?? 0;
    if (due >= 5) return `You have ${due} words and phrases to review. Three minutes is enough. 🧠`;

    const { data: prog } = await admin
      .from("situation_progress")
      .select("pack_id, steps")
      .eq("user_id", userId)
      .not("pack_id", "like", "grammar:%")
      .order("updated_at", { ascending: false })
      .limit(5);
    for (const r of prog ?? []) {
      const n = stepsDone(r.steps as Record<string, unknown> | null);
      if (n > 0 && n < 4) return `Your “${prettify(r.pack_id as string)}” mission is ${n}/4 done. Finish it today! 🎯`;
    }
  } catch (err) {
    console.error("[send-reminders] smartBody fallback", err);
  }

  if (streak > 0) return copy.streak(streak);
  return copy.lines[dayOfYear % copy.lines.length];
}

/** Fecha y minutos del día en la zona horaria del usuario. */
function localParts(now: Date, timeZone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

Deno.serve(async (req) => {
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret")?.trim() !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  // x-dry-run: 1 → no envía nada; solo informa a quién le tocaría (para probar el cron).
  const dryRun = req.headers.get("x-dry-run") === "1";
  // x-force: 1 (solo con dry-run) → ignora la ventana horaria y devuelve los textos.
  const force = dryRun && req.headers.get("x-force") === "1";

  const vapidError = ensureVapid();
  if (vapidError && !dryRun) return Response.json({ error: vapidError }, { status: 500 });

  const now = new Date();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, learning_language, notification_time, timezone, notification_last_sent_on")
    .not("notification_time", "is", null)
    .not("timezone", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let pruned = 0;
  const previews: Array<{ lang: string; body: string }> = [];

  for (const p of profiles ?? []) {
    try {
      const local = localParts(now, p.timezone as string);
      if (!force && p.notification_last_sent_on === local.date) { skipped++; continue; }

      const [hh, mm] = (p.notification_time as string).split(":").map(Number);
      const diff = local.minutes - (hh * 60 + mm);
      if (!force && (diff < 0 || diff >= WINDOW_MINUTES)) continue;

      const { data: lesson } = await admin
        .from("daily_lessons")
        .select("completed")
        .eq("user_id", p.id)
        .eq("lesson_date", local.date)
        .maybeSingle();

      if (lesson?.completed) { skipped++; if (!dryRun) await markSent(p.id, local.date); continue; }

      const lang = p.learning_language === "ca" ? "ca" : "en";
      const copy = COPY[lang];
      // Racha real: días seguidos con práctica completa hasta ayer.
      const since = new Date(now.getTime() - 31 * 86_400_000).toISOString().slice(0, 10);
      const { data: done } = await admin
        .from("daily_lessons")
        .select("lesson_date")
        .eq("user_id", p.id)
        .eq("completed", true)
        .gte("lesson_date", since);
      const streak = streakFrom(new Set((done ?? []).map((r: { lesson_date: string }) => r.lesson_date)), local.date);
      // Rota el mensaje por día del año para que no sea siempre el mismo.
      const dayOfYear = Math.floor(now.getTime() / 86_400_000);
      const body = await smartBody(p.id as string, lang, local.date, streak, dayOfYear);

      if (dryRun) {
        previews.push({ lang, body });
        sent++;
        continue;
      }

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", p.id);
      const payload = JSON.stringify({ title: copy.title, body, url: "/" });

      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err) {
          // 404/410: el dispositivo revocó el permiso o desinstaló → borrar la suscripción.
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            pruned++;
          }
        }
      }

      await markSent(p.id, local.date);
    } catch (err) {
      console.error("[send-reminders] user failed", p.id, err);
    }
  }

  return Response.json({
    dryRun,
    vapid: vapidError ?? "ok",
    [dryRun ? "wouldSend" : "sent"]: sent,
    skipped,
    pruned,
    checked: profiles?.length ?? 0,
    ...(force ? { previews } : {}),
  });
});

async function markSent(userId: string, date: string) {
  await admin.from("profiles").update({ notification_last_sent_on: date }).eq("id", userId);
}
