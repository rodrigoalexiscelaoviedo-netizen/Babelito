/**
 * /live-test — Gemini Live API spike page
 *
 * Minimal proof-of-concept: real-time bidirectional voice with barge-in.
 * Not linked from Nav. Not connected to sessions, streak, or errors.
 * Purpose: validate the WebSocket proxy + audio pipeline before building
 * the real module.
 *
 * Model: verify the exact GA ID in AI Studio and update GEMINI_MODEL below.
 *   Known GA:   models/gemini-2.0-flash-live-001
 *   Target:     models/gemini-2.5-flash-preview-native-audio-dialog
 *               (user referred to it as "gemini-live-2.5-flash-native-audio")
 */

import { useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ── Config ────────────────────────────────────────────────────────────────
// Update this to the correct 2.5 model ID once confirmed in AI Studio.
const GEMINI_MODEL = "models/gemini-2.0-flash-live-001";

const SETUP_MESSAGE = {
  setup: {
    model: GEMINI_MODEL,
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Puck" },
        },
      },
    },
    systemInstruction: {
      parts: [
        {
          text: "You are a friendly English language coach for Spanish speakers. Keep every response under 25 words. Be conversational and warm.",
        },
      ],
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────
type Phase = "idle" | "connecting" | "live" | "error";

// ── Audio helpers ─────────────────────────────────────────────────────────
function float32ToPcm16(f32: Float32Array): Int16Array {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32768)));
  }
  return out;
}

function downsampleF32(src: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return src;
  const ratio = fromRate / toRate;
  const out   = new Float32Array(Math.floor(src.length / ratio));
  for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * ratio)];
  return out;
}

function b64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Component ─────────────────────────────────────────────────────────────
export default function LiveTest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [logLines, setLogLines]   = useState<string[]>([]);

  const wsRef        = useRef<WebSocket | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayRef  = useRef<number>(0);
  const t0Ref        = useRef<number>(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  function log(msg: string) {
    const ts = new Date().toISOString().slice(11, 23);
    const line = `${ts}  ${msg}`;
    console.log("[LiveTest]", line);
    setLogLines((prev) => [...prev.slice(-80), line]);
  }

  // ── Play PCM16 @ 24kHz chunk ──────────────────────────────────────────
  function playChunk(b64: string) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const bytes   = b64ToBytes(b64);
    const i16     = new Int16Array(bytes.buffer);
    const f32     = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    const buf     = ctx.createBuffer(1, f32.length, 24000);
    buf.getChannelData(0).set(f32);
    const src     = ctx.createBufferSource();
    src.buffer    = buf;
    src.connect(ctx.destination);
    // Queue sequentially — each chunk plays right after the previous one
    const when    = Math.max(ctx.currentTime + 0.01, nextPlayRef.current);
    src.start(when);
    nextPlayRef.current = when + buf.duration;
  }

  // ── Handle incoming Gemini messages ───────────────────────────────────
  function onGeminiMessage(raw: string | ArrayBuffer) {
    let msg: Record<string, unknown>;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer);
      msg = JSON.parse(text);
    } catch {
      log(`Non-JSON frame (${typeof raw === "string" ? raw.length : (raw as ArrayBuffer).byteLength} bytes)`);
      return;
    }

    // Setup ack
    if (msg.setupComplete) {
      log("✓ setupComplete — session live, speak now.");
      setStatusMsg("Live — speak to your coach");
      return;
    }

    const sc = msg.serverContent as Record<string, unknown> | undefined;
    if (!sc) {
      log(`Unknown message keys: ${Object.keys(msg).join(", ")}`);
      return;
    }

    // Barge-in: Gemini detected the user speaking during its own turn
    if (sc.interrupted) {
      log("↩ barge-in — Gemini interrupted itself.");
      // Discard any buffered future audio by resetting the play queue
      const ctx = audioCtxRef.current;
      nextPlayRef.current = ctx ? ctx.currentTime : 0;
      return;
    }

    // Turn complete
    if (sc.turnComplete) {
      log("✓ Gemini turn complete.");
      return;
    }

    // Audio response chunk
    const turn  = sc.modelTurn as Record<string, unknown> | undefined;
    const parts = turn?.parts as Array<Record<string, unknown>> | undefined;
    if (!parts) return;

    for (const part of parts) {
      const inline = part.inlineData as Record<string, unknown> | undefined;
      if (
        typeof inline?.data === "string" &&
        typeof inline?.mimeType === "string" &&
        (inline.mimeType as string).startsWith("audio/pcm")
      ) {
        playChunk(inline.data as string);
      }
    }
  }

  // ── Start audio capture with ScriptProcessorNode ──────────────────────
  function startCapture(stream: MediaStream, ctx: AudioContext, ws: WebSocket) {
    const source    = ctx.createMediaStreamSource(stream);
    // 4096-sample buffer (≈85ms at 48kHz); 1 input channel, 1 output channel
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    // Route through a muted GainNode to prevent echo without breaking the graph
    const mute      = ctx.createGain();
    mute.gain.value = 0;
    source.connect(processor);
    processor.connect(mute);
    mute.connect(ctx.destination);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const f32at48  = e.inputBuffer.getChannelData(0);
      const f32at16  = downsampleF32(f32at48, ctx.sampleRate, 16000);
      const pcm16    = float32ToPcm16(f32at16);
      const b64      = bytesToB64(pcm16.buffer as ArrayBuffer);
      ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: b64 }],
          },
        })
      );
    };

    log(`Audio capture started (native rate ${ctx.sampleRate} Hz → 16 kHz for Gemini).`);
  }

  // ── Start call ────────────────────────────────────────────────────────
  async function startCall() {
    setPhase("connecting");
    setStatusMsg("Connecting…");
    setLogLines([]);
    setElapsed(0);
    log(`Starting session — model: ${GEMINI_MODEL}`);

    // 1. Auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setPhase("error");
      setStatusMsg("Not logged in.");
      return;
    }

    // 2. Microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      log("Microphone acquired.");
    } catch (err) {
      setPhase("error");
      setStatusMsg(`Mic denied: ${err}`);
      log(`Mic error: ${err}`);
      return;
    }

    // 3. AudioContext (native rate; PCM16 buffers declare their own rate)
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    nextPlayRef.current = 0;
    if (ctx.state === "suspended") await ctx.resume();

    // 4. WebSocket → live-proxy
    const base   = (import.meta.env.VITE_SUPABASE_URL as string).replace("https://", "wss://");
    const wsUrl  = `${base}/functions/v1/live-proxy?token=${token}`;
    const ws     = new WebSocket(wsUrl);
    wsRef.current = ws;
    t0Ref.current = Date.now();

    ws.onopen = () => {
      log("WS open → sending setup message.");
      ws.send(JSON.stringify(SETUP_MESSAGE));
      startCapture(stream, ctx, ws);
      setPhase("live");
      // Session timer (logs every 60 s; warns at 14.5 min)
      sessionTimerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0Ref.current) / 1000);
        setElapsed(s);
        if (s === 870) log("⚠️  ~14.5 min elapsed — Gemini session limit (~15 min) approaching.");
      }, 1000);
    };

    ws.onmessage = (ev) => onGeminiMessage(ev.data);

    ws.onerror = () => {
      log("WS error (see DevTools Network tab for detail).");
      setPhase("error");
      setStatusMsg("Connection error.");
      cleanup();
    };

    ws.onclose = (ev) => {
      const dur = ((Date.now() - t0Ref.current) / 1000).toFixed(1);
      const reason = ev.reason ? ` — "${ev.reason}"` : "";
      log(`WS closed at ${dur}s  code=${ev.code}${reason}`);
      if (ev.code !== 1000 && ev.code !== 1001) {
        log(`Unexpected close code ${ev.code} — may indicate a proxy or Gemini error.`);
      }
      cleanup();
      setPhase("idle");
      setStatusMsg(`Session ended after ${dur}s`);
    };
  }

  // ── Hang up ───────────────────────────────────────────────────────────
  function hangUp() {
    log("Hang up requested.");
    wsRef.current?.close(1000, "user hang up");
    cleanup();
    setPhase("idle");
    setStatusMsg("Hung up.");
  }

  // ── Cleanup ───────────────────────────────────────────────────────────
  function cleanup() {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    wsRef.current = null;
  }

  // ── Format elapsed time ───────────────────────────────────────────────
  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "JetBrains Mono, monospace",
        maxWidth: 720,
        margin: "0 auto",
        color: "#eaeef7",
      }}
    >
      <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
        Gemini Live — Spike /live-test
      </h1>
      <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 20 }}>
        Model: {GEMINI_MODEL} · dev-only · not linked from nav
      </p>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={startCall}
          disabled={phase !== "idle"}
          style={{
            padding: "10px 20px",
            background: "#2C9E86",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: phase === "idle" ? "pointer" : "not-allowed",
            opacity: phase === "idle" ? 1 : 0.4,
            fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          Start call
        </button>

        <button
          onClick={hangUp}
          disabled={phase !== "live"}
          style={{
            padding: "10px 20px",
            background: "#FF6B5E",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: phase === "live" ? "pointer" : "not-allowed",
            opacity: phase === "live" ? 1 : 0.4,
            fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          Hang up
        </button>

        <span
          style={{
            fontSize: 13,
            color:
              phase === "live"
                ? "#2C9E86"
                : phase === "error"
                ? "#FF6B5E"
                : phase === "connecting"
                ? "#C9A227"
                : "#6b7280",
          }}
        >
          {phase === "idle" && (statusMsg || "Ready")}
          {phase === "connecting" && "⏳ Connecting…"}
          {phase === "live" && `🔴 Live  ${fmtElapsed(elapsed)}`}
          {phase === "error" && `❌ ${statusMsg}`}
        </span>
      </div>

      {/* Barge-in hint */}
      {phase === "live" && (
        <p style={{ fontSize: 11, color: "#C9A227", marginBottom: 12 }}>
          Barge-in active — speak while the coach talks to interrupt.
        </p>
      )}

      {/* Log panel */}
      <div
        id="live-log"
        style={{
          background: "#0e1320",
          border: "1px solid #1e2d45",
          borderRadius: 8,
          padding: "12px 14px",
          height: 340,
          overflowY: "auto",
          fontSize: 11,
          lineHeight: 1.7,
          color: "#94a3b8",
        }}
      >
        {logLines.length === 0 ? (
          <span style={{ color: "#374151" }}>Console log will appear here…</span>
        ) : (
          logLines.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.includes("❌") || line.includes("error")
                  ? "#FF6B5E"
                  : line.includes("⚠️")
                  ? "#C9A227"
                  : line.includes("✓") || line.includes("barge")
                  ? "#2C9E86"
                  : "#94a3b8",
              }}
            >
              {line}
            </div>
          ))
        )}
      </div>

      <p style={{ marginTop: 10, fontSize: 11, color: "#374151" }}>
        Full detail in DevTools console · session auto-closes ~15 min · no data saved to DB
      </p>

      {/* Setup reference */}
      <details style={{ marginTop: 20, fontSize: 11, color: "#4b5563" }}>
        <summary style={{ cursor: "pointer", color: "#6b7280" }}>
          Deploy commands (run once)
        </summary>
        <pre
          style={{
            marginTop: 8,
            background: "#0e1320",
            border: "1px solid #1e2d45",
            borderRadius: 6,
            padding: 12,
            color: "#94a3b8",
            overflowX: "auto",
          }}
        >
{`supabase functions deploy live-proxy --no-verify-jwt
supabase secrets set GEMINI_API_KEY=AIza...

# Then verify model name in AI Studio and update GEMINI_MODEL in this file.
# Known GA:  models/gemini-2.0-flash-live-001
# Target:    models/gemini-2.5-flash-preview-native-audio-dialog`}
        </pre>
      </details>
    </div>
  );
}
