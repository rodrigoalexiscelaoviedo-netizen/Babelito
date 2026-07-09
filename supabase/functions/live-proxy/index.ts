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
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")   ?? "";
const SUPABASE_ANON  = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const GEMINI_WS_URL =
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req: Request) => {
  // ── FIRST LINE: confirm function executes at all ──────────────────────────
  console.log("[live-proxy] invoked", req.method, new URL(req.url).pathname);

  try {
    // Must be a WebSocket upgrade
    if ((req.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }

    if (!GEMINI_API_KEY) {
      console.error("[live-proxy] GEMINI_API_KEY secret not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    // ── Auth ────────────────────────────────────────────────────────────────
    const url   = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      console.warn("[live-proxy] no token in query params");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[live-proxy] verifying JWT…");
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      console.warn("[live-proxy] JWT invalid:", authErr?.message);
      return new Response("Unauthorized", { status: 401 });
    }
    console.log("[live-proxy] auth ok, user=", user.id);

    // ── Accept WebSocket upgrade from client ─────────────────────────────────
    // Do this BEFORE attempting to connect to Gemini so that any Gemini error
    // can be reported via a clean WS close frame instead of a 502.
    const { socket: client, response } = Deno.upgradeWebSocket(req);
    console.log("[live-proxy] client WS upgraded");

    const t0  = Date.now();
    const dur = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

    // ── Connect to Gemini once the client socket is open ────────────────────
    // Deferring the Gemini connection to onopen prevents the race condition
    // where a Gemini failure crashes the function before we return `response`.
    client.onopen = () => {
      console.log("[live-proxy] client onopen — connecting to Gemini");

      let gemini: WebSocket;
      try {
        gemini = new WebSocket(GEMINI_WS_URL);
        gemini.binaryType = "arraybuffer";
      } catch (err) {
        console.error("[live-proxy] failed to create Gemini WebSocket:", err);
        client.close(1011, "Cannot reach AI service");
        return;
      }

      // Buffer client messages that arrive while Gemini is still opening
      const pending: (string | ArrayBuffer)[] = [];

      client.onmessage = (ev) => {
        if (gemini.readyState === WebSocket.OPEN) {
          gemini.send(ev.data);
        } else {
          pending.push(ev.data);
        }
      };

      client.onerror = (e) => console.error("[live-proxy] client error", e);
      client.onclose = (ev) => {
        console.log(`[live-proxy] client closed at ${dur()} code=${ev.code} reason="${ev.reason}"`);
        if (gemini.readyState < WebSocket.CLOSING) gemini.close();
      };

      gemini.onopen = () => {
        console.log(`[live-proxy] Gemini WS open — flushing ${pending.length} pending message(s)`);
        for (const msg of pending) gemini.send(msg);
        pending.length = 0;
      };

      gemini.onmessage = (ev) => {
        if (client.readyState === WebSocket.OPEN) client.send(ev.data);
      };

      gemini.onerror = (e) => {
        // Log the full event — often contains the HTTP status that caused the WS rejection
        console.error("[live-proxy] Gemini WS error:", JSON.stringify(e));
      };

      gemini.onclose = (ev) => {
        console.log(
          `[live-proxy] Gemini WS closed at ${dur()} code=${ev.code} reason="${ev.reason}"`,
          `wasClean=${ev.wasClean}`
        );
        if (client.readyState < WebSocket.CLOSING) {
          // Propagate a meaningful close to the browser
          const code = (ev.code >= 3000 || ev.code === 1000) ? ev.code : 1011;
          client.close(code, ev.reason || "Gemini session ended");
        }
      };
    };

    // Return the 101 Switching Protocols response — from here the Deno runtime
    // drives the WS event loop; the function handler is no longer in the call stack.
    console.log("[live-proxy] returning WS upgrade response");
    return response;

  } catch (err) {
    // Catch any synchronous error in the setup path so it shows in logs
    // instead of silently producing a 502 with empty body.
    console.error("[live-proxy] unhandled setup error:", err);
    return new Response(`Internal error: ${err}`, { status: 500 });
  }
});
