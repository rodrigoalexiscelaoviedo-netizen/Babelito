/**
 * live-proxy-echo-test — Supabase Edge Function (ISOLATION TEST)
 *
 * Tests whether Supabase Edge Functions can open outbound WebSocket connections.
 * Uses a public echo server (no Gemini involved at all).
 *
 * Two modes:
 *
 *   1. HTTP GET (no WS upgrade) → tests outbound WS purely server-side.
 *      Trigger: fetch("https://<project>.supabase.co/functions/v1/live-proxy-echo-test")
 *      Response: plain text "OK" or "FAIL: <reason>" — readable in browser or curl.
 *      Logs show the full outbound WS lifecycle.
 *
 *   2. WS upgrade → full relay test (client ↔ proxy ↔ echo server).
 *      Trigger: new WebSocket("wss://...functions/v1/live-proxy-echo-test")
 *      Client receives JSON status messages: { status, data?, t }.
 *
 * Deploy:
 *   supabase functions deploy live-proxy-echo-test --no-verify-jwt
 *   (no secrets required — no Gemini, no auth check)
 */

// Public echo server: sends back exactly what it receives.
// Query param added to test whether Supabase preserves query strings on outbound WS
// (Gemini uses ?key=... — if this param gets stripped, Gemini would reject with 403→1006).
const ECHO_URL = "wss://echo.websocket.org/?test-key=babelito-probe-123";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log("[echo-test] invoked", req.method, new URL(req.url).pathname);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const isWsUpgrade = (req.headers.get("upgrade") ?? "").toLowerCase() === "websocket";

  // ── Mode 1: plain HTTP → server-side only outbound WS test ───────────────
  if (!isWsUpgrade) {
    console.log("[echo-test] HTTP mode — testing outbound WS without a client");
    try {
      const result = await testOutboundWs();
      console.log("[echo-test] HTTP mode result:", result);
      return new Response(result, {
        status: result.startsWith("OK") ? 200 : 500,
        headers: { "Content-Type": "text/plain", ...CORS_HEADERS },
      });
    } catch (err) {
      console.error("[echo-test] HTTP mode threw:", err);
      return new Response(`FAIL (exception): ${err}`, { status: 500, headers: CORS_HEADERS });
    }
  }

  // ── Mode 2: WS upgrade → relay test ──────────────────────────────────────
  try {
    const { socket: client, response } = Deno.upgradeWebSocket(req);
    console.log("[echo-test] client WS upgraded");

    client.onopen = () => {
      console.log("[echo-test] client open — connecting to echo server:", ECHO_URL);

      let echo: WebSocket;
      try {
        echo = new WebSocket(ECHO_URL);
      } catch (err) {
        console.error("[echo-test] failed to construct echo WebSocket:", err);
        client.close(1011, `Cannot reach echo server: ${err}`);
        return;
      }

      const t0  = Date.now();
      const dur = () => `${((Date.now() - t0) / 1000).toFixed(2)}s`;
      const send = (obj: Record<string, unknown>) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(obj));
        }
      };

      const pending: (string | ArrayBuffer)[] = [];

      // ── Echo server events ──────────────────────────────────────────────
      echo.onopen = () => {
        console.log(`[echo-test] ✓ Echo WS OPEN at ${dur()}`);
        send({ status: "echo_open", t: dur() });

        // Flush buffered client messages
        for (const msg of pending) echo.send(msg);
        pending.length = 0;

        // Send a probe message
        echo.send("ping-from-supabase-proxy");

        // Auto-close after 12s so we confirm the connection stays alive
        setTimeout(() => {
          console.log(`[echo-test] auto-close at ${dur()}`);
          send({ status: "auto_close", t: dur() });
          echo.close(1000, "test complete");
        }, 12000);
      };

      echo.onmessage = (ev) => {
        console.log(`[echo-test] ✓ Echo received at ${dur()}:`, ev.data);
        send({ status: "echo_message", data: String(ev.data), t: dur() });
      };

      echo.onerror = (e) => {
        console.error(`[echo-test] ✗ Echo WS error at ${dur()}:`, JSON.stringify(e));
        send({ status: "echo_error", detail: JSON.stringify(e), t: dur() });
      };

      echo.onclose = (ev) => {
        console.log(
          `[echo-test] Echo WS closed at ${dur()} code=${ev.code}`,
          `reason="${ev.reason}" wasClean=${ev.wasClean}`
        );
        send({ status: "echo_closed", code: ev.code, wasClean: ev.wasClean, t: dur() });
        if (client.readyState < WebSocket.CLOSING) client.close(1000, "echo done");
      };

      // ── Client events (after echo is set up) ────────────────────────────
      client.onmessage = (ev) => {
        if (echo.readyState === WebSocket.OPEN) {
          echo.send(ev.data);
        } else {
          pending.push(ev.data);
        }
      };

      client.onerror = (e) => console.error("[echo-test] client error", e);
      client.onclose = (ev) => {
        console.log(`[echo-test] client closed at ${dur()} code=${ev.code}`);
        if (echo.readyState < WebSocket.CLOSING) echo.close();
      };
    };

    console.log("[echo-test] returning WS upgrade response");
    return response;

  } catch (err) {
    console.error("[echo-test] unhandled error:", err);
    return new Response(`Internal error: ${err}`, { status: 500 });
  }
});

// ── Outbound WS test (HTTP mode helper) ────────────────────────────────────
function testOutboundWs(): Promise<string> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    const timeout = setTimeout(() => {
      console.error("[echo-test] outbound WS timeout after 8s");
      try { ws?.close(); } catch { /* ignore */ }
      resolve("FAIL: timeout after 8s — no open/message/error received");
    }, 8000);

    try {
      console.log("[echo-test] new WebSocket(", ECHO_URL, ")");
      ws = new WebSocket(ECHO_URL);
    } catch (err) {
      clearTimeout(timeout);
      resolve(`FAIL: WebSocket constructor threw: ${err}`);
      return;
    }

    ws.onopen = () => {
      console.log("[echo-test] outbound WS opened ✓");
      ws.send("hello-from-supabase");
    };

    ws.onmessage = (e) => {
      clearTimeout(timeout);
      console.log("[echo-test] outbound WS message received ✓:", e.data);
      ws.close(1000);
      resolve(`OK: outbound WebSocket works — echo received: "${e.data}"`);
    };

    ws.onerror = (e) => {
      clearTimeout(timeout);
      const detail = JSON.stringify(e);
      console.error("[echo-test] outbound WS error ✗:", detail);
      resolve(`FAIL: WebSocket error — ${detail}`);
    };

    ws.onclose = (e) => {
      // Only fires as failure if we haven't resolved yet
      if (e.code !== 1000) {
        clearTimeout(timeout);
        console.error("[echo-test] outbound WS closed before message code=", e.code);
        resolve(`FAIL: WS closed before receiving echo — code=${e.code} wasClean=${e.wasClean}`);
      }
    };
  });
}
