/**
 * Conversación en tiempo real con Gemini Live (voz a voz) — BETA.
 *
 * Flujo: la función `gemini-tools` entrega una credencial de un solo uso; el
 * navegador abre un WebSocket directo con Gemini, envía el micrófono (PCM 16 kHz)
 * y reproduce el audio que llega (PCM 24 kHz). La clave real nunca sale del servidor.
 *
 * Las partes puras (conversión de audio, mensajes) están testeadas; la captura
 * del micrófono y la reproducción requieren un navegador real.
 */
import { getLiveToken } from "./geminiTools";

export const LIVE_INPUT_RATE = 16000;
export const LIVE_OUTPUT_RATE = 24000;

const WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

// ── Puras (testeadas) ────────────────────────────────────────────────────────────

/** Reduce la frecuencia promediando muestras (suficiente para voz). */
export function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function pcm16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] / (input[i] < 0 ? 0x8000 : 0x7fff);
  return out;
}

export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function base64ToPcm(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
}

export function liveSystemPrompt(opts: { level: string; name: string; topic: string | null }): string {
  return [
    `You are Babelito, a warm English conversation partner on a live voice call with ${opts.name || "a learner"}, a Spanish speaker at CEFR level ${opts.level}.`,
    "Speak clearly and a little slowly. Keep every turn short (1–3 sentences) and ask only one question at a time.",
    "Use vocabulary and grammar suited to the level. Never lecture.",
    "When the learner makes a mistake, naturally repeat the correct form inside your reply (a recast) and move on; only explain if they ask.",
    "If they seem stuck or silent, offer one very short hint in Spanish, then continue in English.",
    opts.topic ? `Topic for this call: ${opts.topic}.` : "Choose a friendly everyday topic.",
    "Start by greeting them and asking a first simple question.",
  ].join(" ");
}

export function buildSetupMessage(model: string, systemPrompt: string, voice = "Aoede") {
  return {
    setup: {
      model: model.startsWith("models/") ? model : `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  };
}

export type LiveEvent =
  | { type: "setup" }
  | { type: "audio"; pcm: Int16Array }
  | { type: "turnComplete" }
  | { type: "interrupted" }
  | { type: "heard"; text: string }
  | { type: "said"; text: string }
  | { type: "unknown" };

/** Convierte un mensaje del servidor en uno o más eventos simples. */
export function parseServerMessage(raw: unknown): LiveEvent[] {
  const m = raw as {
    setupComplete?: unknown;
    serverContent?: {
      modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      turnComplete?: boolean;
      interrupted?: boolean;
      inputTranscription?: { text?: string };
      outputTranscription?: { text?: string };
    };
  } | null;
  if (!m || typeof m !== "object") return [{ type: "unknown" }];
  const events: LiveEvent[] = [];
  if (m.setupComplete !== undefined) events.push({ type: "setup" });
  const sc = m.serverContent;
  if (sc) {
    for (const p of sc.modelTurn?.parts ?? []) {
      const d = p.inlineData;
      if (d?.data && (d.mimeType ?? "").startsWith("audio/")) events.push({ type: "audio", pcm: base64ToPcm(d.data) });
    }
    if (sc.inputTranscription?.text) events.push({ type: "heard", text: sc.inputTranscription.text });
    if (sc.outputTranscription?.text) events.push({ type: "said", text: sc.outputTranscription.text });
    if (sc.interrupted) events.push({ type: "interrupted" });
    if (sc.turnComplete) events.push({ type: "turnComplete" });
  }
  return events.length ? events : [{ type: "unknown" }];
}

export function liveSupported(): boolean {
  return typeof window !== "undefined" && "WebSocket" in window && "AudioContext" in window && !!navigator.mediaDevices?.getUserMedia;
}

// ── Sesión (navegador) ───────────────────────────────────────────────────────────

const WORKLET_SRC = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(new Float32Array(ch));
    return true;
  }
}
registerProcessor("babelito-capture", Capture);
`;

export interface LiveHandlers {
  onState: (s: "connecting" | "live" | "ended" | "error", detail?: string) => void;
  onHeard?: (text: string) => void;
  onSaid?: (text: string) => void;
  onSpeaking?: (speaking: boolean) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private playhead = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private closed = false;

  constructor(private readonly handlers: LiveHandlers, private readonly prompt: { level: string; name: string; topic: string | null }) {}

  async start(): Promise<void> {
    this.handlers.onState("connecting");
    try {
      const { token, model } = await getLiveToken();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.ctx = new AudioContext();
      await this.ctx.resume();

      this.ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
      this.ws.onopen = () => this.ws?.send(JSON.stringify(buildSetupMessage(model, liveSystemPrompt(this.prompt))));
      this.ws.onmessage = (ev) => void this.onMessage(ev.data);
      this.ws.onerror = () => this.fail("No se pudo conectar con la conversación en vivo.");
      this.ws.onclose = (ev) => {
        if (!this.closed) this.fail(ev.reason || "La conversación en vivo se cerró.");
      };
    } catch (e) {
      this.fail(e instanceof Error ? e.message : "No se pudo iniciar la conversación en vivo.");
    }
  }

  private async onMessage(data: unknown) {
    let raw: unknown;
    try {
      raw = JSON.parse(typeof data === "string" ? data : await (data as Blob).text());
    } catch {
      return;
    }
    for (const ev of parseServerMessage(raw)) {
      if (ev.type === "setup") {
        await this.startMic();
        this.handlers.onState("live");
        // El coach saluda primero.
        this.ws?.send(JSON.stringify({ realtimeInput: { text: "Hello! Please start the call." } }));
      } else if (ev.type === "audio") this.play(ev.pcm);
      else if (ev.type === "interrupted") this.stopPlayback();
      else if (ev.type === "heard") this.handlers.onHeard?.(ev.text);
      else if (ev.type === "said") this.handlers.onSaid?.(ev.text);
      else if (ev.type === "turnComplete") this.handlers.onSpeaking?.(false);
    }
  }

  private async startMic() {
    if (!this.ctx || !this.stream) return;
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "babelito-capture");
    const inRate = this.ctx.sampleRate;
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      const pcm = floatToPcm16(downsample(e.data, inRate, LIVE_INPUT_RATE));
      this.ws.send(JSON.stringify({ realtimeInput: { audio: { data: pcmToBase64(pcm), mimeType: `audio/pcm;rate=${LIVE_INPUT_RATE}` } } }));
    };
    src.connect(this.node);
    // El nodo no se conecta a la salida: así no se oye a sí mismo.
  }

  private play(pcm: Int16Array) {
    if (!this.ctx) return;
    const f = pcm16ToFloat(pcm);
    const buf = this.ctx.createBuffer(1, f.length, LIVE_OUTPUT_RATE);
    buf.copyToChannel(f as Float32Array<ArrayBuffer>, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    this.playhead = Math.max(this.playhead, now + 0.02);
    src.start(this.playhead);
    this.playhead += buf.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.handlers.onSpeaking?.(false);
    };
    this.handlers.onSpeaking?.(true);
  }

  private stopPlayback() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* ya terminada */
      }
    }
    this.sources.clear();
    this.playhead = 0;
    this.handlers.onSpeaking?.(false);
  }

  private fail(message: string) {
    if (this.closed) return;
    this.cleanup();
    this.handlers.onState("error", message);
  }

  /** Cuelga y libera micrófono y audio. */
  stop() {
    if (this.closed) return;
    this.cleanup();
    this.handlers.onState("ended");
  }

  private cleanup() {
    this.closed = true;
    this.stopPlayback();
    try {
      this.node?.disconnect();
    } catch {
      /* ya desconectado */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    try {
      this.ws?.close();
    } catch {
      /* ya cerrado */
    }
    void this.ctx?.close();
  }
}
