/**
 * live-proxy — Supabase Edge Function
 *
 * Bidirectional WebSocket relay between the browser and Gemini Live API.
 * The GEMINI_API_KEY lives only here; the browser never sees it.
 *
 * Auth: the browser passes its Supabase JWT as ?token=<jwt> in the WS URL
 * because the browser WebSocket API can't set custom headers.
 *
 * Deploy:
 *   supabase functions deploy live-proxy --no-verify-jwt
 *   supabase secrets set GEMINI_API_KEY=AIza...
 *
 * Model note: verify the exact ID in AI Studio before deploying.
 *   Current GA:   models/gemini-2.0-flash-live-001
 *   Target spike: models/gemini-2.5-flash-preview-native-audio-dialog
 *   (the client sends the model name in the setup message, not here)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")   ?? "";
const SUPABASE_ANON  = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const GEMINI_WS_URL =
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req: Request) => {
  // Must be a WebSocket upgrade
  if ((req.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
    return new Response("WebSocket upgrade required", { status: 426 });
  }

  if (!GEMINI_API_KEY) {
    console.error("[live-proxy] GEMINI_API_KEY secret not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Browser WS can't send Authorization header → JWT via ?token= query param
  const url   = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    console.warn("[live-proxy] JWT invalid:", authErr?.message);
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Upgrade client socket ─────────────────────────────────────────────────
  const { socket: client, response } = Deno.upgradeWebSocket(req);

  // ── Connect to Gemini Live ─────────────────────────────────────────────────
  const gemini = new WebSocket(GEMINI_WS_URL);
  gemini.binaryType = "arraybuffer";

  const t0  = Date.now();
  const dur = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

  console.log(`[live-proxy] session open  user=${user.id}`);

  // Client → Gemini (setup messages + audio chunks)
  client.onmessage = (ev) => {
    if (gemini.readyState === WebSocket.OPEN) gemini.send(ev.data);
  };
  client.onerror = (e) => console.error("[live-proxy] client error", e);
  client.onclose = (ev) => {
    console.log(`[live-proxy] client closed at ${dur()} code=${ev.code} reason="${ev.reason}"`);
    if (gemini.readyState < WebSocket.CLOSING) gemini.close();
  };

  // Gemini → Client (audio response + control events)
  gemini.onmessage = (ev) => {
    if (client.readyState === WebSocket.OPEN) client.send(ev.data);
  };
  gemini.onerror = (e) => console.error("[live-proxy] gemini error", e);
  gemini.onclose = (ev) => {
    console.log(`[live-proxy] gemini closed at ${dur()} code=${ev.code} reason="${ev.reason}"`);
    if (client.readyState < WebSocket.CLOSING) client.close();
  };

  return response;
});
