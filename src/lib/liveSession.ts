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
import { ERROR_TYPES } from "./errorTypes";
import { examinerSystemPrompt, normalizeExaminerRating, SUBMIT_RATING_TOOL, type ExaminerLang, type ExaminerRating } from "./placementExaminer";

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

/** Situación de llamada: el coach es quien llama y abre la conversación. */
export interface LiveSituation {
  title: string;
  coachRole: string;
  opening: string;
  description: string;
}

/** Niveles principiantes (noveles): reciben apoyo en español. */
export function isBeginnerLevel(level: string): boolean {
  return level === "A1" || level === "A2";
}

/** Mensaje claro para el usuario según por qué no arrancó la llamada. */
export function describeStartError(e: unknown, lang: "en" | "ca" = "en"): string {
  const name = typeof e === "object" && e !== null && "name" in e ? String((e as { name: unknown }).name) : "";
  if (lang === "ca") {
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "El micròfon està bloquejat. Permet-lo a la configuració del lloc del navegador (la icona del cadenat, al costat de l'adreça) i torna-ho a provar.";
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") return "No hem trobat cap micròfon. Connecta'n un i torna-ho a provar.";
    if (name === "NotReadableError") return "El micròfon l'està usant una altra aplicació. Tanca-la i torna-ho a provar.";
    return e instanceof Error && e.message ? e.message : "No hem pogut iniciar la trucada en directe. Torna-ho a provar d'aquí a un moment.";
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow it in your browser's site settings (the lock icon next to the address) and try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "We couldn't find a microphone. Connect one and try again.";
  }
  if (name === "NotReadableError") {
    return "The microphone is being used by another app. Close it and try again.";
  }
  return e instanceof Error && e.message ? e.message : "We couldn't start the live call. Try again in a moment.";
}

export function liveSystemPrompt(opts: { level: string; name: string; topic: string | null; situation?: LiveSituation | null; lang?: "en" | "ca" }): string {
  if (opts.lang === "ca") return liveSystemPromptCa(opts);
  const who = opts.name || "a learner";
  const support = isBeginnerLevel(opts.level)
    ? "The learner is a beginner: when a key word or idea is not clear, explain it briefly in Spanish, then go back to English. Keep Spanish to a few words per turn."
    : "Speak English only. Use Spanish only if the learner is completely stuck, and then only one short word or phrase.";
  const common = [
    "Speak clearly and a little slowly. Keep every turn short (1–3 sentences) and ask only one question at a time.",
    "Use vocabulary and grammar suited to the level. Never lecture.",
    "Listen closely: build each question on something specific the learner just said. Ask for a detail, a reason or an example before changing the subject. If an answer is very short, invite them to say more.",
    "When the learner makes a clear mistake (grammar, a wrong word, or an unnatural phrase; never pronunciation), do this in order: first call the log_correction tool with the correction; then say one very short tip out loud, starting with 'Quick tip:' and one simple sentence; then answer what they said and ask one question. At most one tip per turn. Do not explain more unless they ask.",
    support,
  ];

  if (opts.situation) {
    const s = opts.situation;
    return [
      `You are Babelito playing a role on a live phone call with ${who}, a Spanish speaker at CEFR level ${opts.level}.`,
      `You are the one calling. Your role: ${s.coachRole}. Situation: ${s.description}.`,
      `Open the call yourself, right away, with a line like: "${s.opening}". Do not wait for the learner to speak first.`,
      "Stay in character the whole time. Do not correct the learner as a teacher; keep the conversation going naturally.",
      "Follow up the way a real person in your role would: in an interview or any formal check, probe vague answers and ask for concrete examples, politely.",
      ...common,
    ].join(" ");
  }

  return [
    `You are Babelito, a warm English conversation partner on a live voice call with ${who}, a Spanish speaker at CEFR level ${opts.level}.`,
    ...common,
    opts.topic ? `Topic for this call: ${opts.topic}.` : "Choose a friendly everyday topic.",
    "Start by greeting them and asking a first simple question.",
  ].join(" ");
}

/** Prompt del coach en catalán: habla català; el alumno es hispanohablante, así que el apoyo es en castellano. */
function liveSystemPromptCa(opts: { level: string; name: string; topic: string | null; situation?: LiveSituation | null }): string {
  const who = opts.name || "un alumne";
  const support = isBeginnerLevel(opts.level)
    ? "The learner is a beginner: when a key word or idea is not clear, explain it briefly in Spanish, then go back to Catalan. Keep Spanish to a few words per turn."
    : "Speak Catalan only. Use Spanish only if the learner is completely stuck, and then only one short word or phrase.";
  const common = [
    "Speak clearly and a little slowly, in standard Catalan. Keep every turn short (1–3 sentences) and ask only one question at a time.",
    "Use vocabulary and grammar suited to the level. Never lecture.",
    "When the learner makes a clear mistake (grammar, a wrong word, a Spanish calque, or an unnatural phrase; never pronunciation), do this in order: first call the log_correction tool with the correction; then say one very short tip out loud, starting with 'Consell ràpid:' and one simple sentence; then answer what they said and ask one question. At most one tip per turn. Do not explain more unless they ask.",
    support,
  ];

  if (opts.situation) {
    const s = opts.situation;
    return [
      `You are Babelito playing a role on a live phone call in Catalan with ${who}, a Spanish speaker at CEFR level ${opts.level}.`,
      `You are the one calling. Your role: ${s.coachRole}. Situation: ${s.description}.`,
      `Open the call yourself, right away, with a line like: "${s.opening}". Do not wait for the learner to speak first.`,
      "Stay in character the whole time. Do not correct the learner as a teacher; keep the conversation going naturally.",
      ...common,
    ].join(" ");
  }

  return [
    `You are Babelito, a warm Catalan conversation partner on a live voice call with ${who}, a Spanish speaker at CEFR level ${opts.level}.`,
    ...common,
    opts.topic ? `Topic for this call: ${opts.topic}.` : "Choose a friendly everyday topic.",
    "Start by greeting them in Catalan and asking a first simple question.",
  ].join(" ");
}

/** Tiempo máximo de una llamada en vivo (segundos). Live cobra por minuto. */
export const LIVE_MAX_SECONDS = 15 * 60;

/** Herramienta que el coach llama en cuanto detecta un error del alumno, antes de responder. */
export const LOG_CORRECTION_TOOL = {
  name: "log_correction",
  description:
    "Call this BEFORE you reply, each time the learner makes a clear mistake (grammar, wrong word, unnatural phrase). Never for pronunciation.",
  parameters: {
    type: "OBJECT",
    properties: {
      original: { type: "STRING", description: "What the learner said, a short exact quote" },
      correction: { type: "STRING", description: "The correct, natural version" },
      explanation: { type: "STRING", description: "One short, simple reason" },
      type: { type: "STRING", enum: Object.keys(ERROR_TYPES), description: "Kind of mistake; 'other' if none fits" },
    },
    required: ["original", "correction", "explanation", "type"],
  },
};

/** Corrección en vivo que la IA registró durante la llamada. */
export interface LiveCorrection {
  original: string;
  correction: string;
  explanation: string;
  /** Clave de ERROR_TYPES; puede faltar si la IA no la manda. */
  type?: string;
}

export function buildSetupMessage(model: string, systemPrompt: string, voice = "Aoede", tools: object[] = [LOG_CORRECTION_TOOL]) {
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
      tools: [{ functionDeclarations: tools }],
    },
  };
}

export interface LiveToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export type LiveEvent =
  | { type: "setup" }
  | { type: "audio"; pcm: Int16Array }
  | { type: "turnComplete" }
  | { type: "interrupted" }
  | { type: "heard"; text: string }
  | { type: "said"; text: string }
  | { type: "toolCall"; calls: LiveToolCall[] }
  | { type: "unknown" };

/** Convierte un mensaje del servidor en uno o más eventos simples. */
export function parseServerMessage(raw: unknown): LiveEvent[] {
  const m = raw as {
    setupComplete?: unknown;
    toolCall?: { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> };
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
  if (m.toolCall?.functionCalls?.length) {
    events.push({
      type: "toolCall",
      calls: m.toolCall.functionCalls.map((c) => ({ id: c.id ?? "", name: c.name ?? "", args: c.args ?? {} })),
    });
  }
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

/** Módulo de captura: archivo estático (la política de seguridad no admite scripts desde Blob). */
export const WORKLET_URL = "/live-worklet.js";

export interface LiveHandlers {
  onState: (s: "connecting" | "live" | "ended" | "error", detail?: string) => void;
  onHeard?: (text: string) => void;
  onSaid?: (text: string) => void;
  onSpeaking?: (speaking: boolean) => void;
  onCorrection?: (c: LiveCorrection) => void;
  /** Solo en modo examinador: la calificación final, o null si llegó mal formada. */
  onRating?: (r: ExaminerRating | null) => void;
}

/** Normaliza los argumentos de log_correction (la IA puede omitir campos). */
export function normalizeCorrection(args: Record<string, unknown>): LiveCorrection {
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const type = s(args.type, 40);
  return {
    original: s(args.original, 160),
    correction: s(args.correction, 160),
    explanation: s(args.explanation, 240),
    ...(type ? { type } : {}),
  };
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private playhead = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private closed = false;

  /**
   * `examiner` cambia la sesión a modo examinador (test de nivel): otro prompt y solo la
   * herramienta submit_rating. Sin él, es la conversación normal de IA Live.
   */
  constructor(
    private readonly handlers: LiveHandlers,
    private readonly prompt: { level: string; name: string; topic: string | null; situation?: LiveSituation | null; lang?: "en" | "ca" },
    private readonly examiner: { lang: ExaminerLang } | null = null
  ) {}

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
      const setup = this.examiner
        ? buildSetupMessage(model, examinerSystemPrompt(this.examiner.lang), "Aoede", [SUBMIT_RATING_TOOL])
        : buildSetupMessage(model, liveSystemPrompt(this.prompt));
      this.ws.onopen = () => this.ws?.send(JSON.stringify(setup));
      this.ws.onmessage = (ev) => void this.onMessage(ev.data);
      this.ws.onerror = () => this.fail("We couldn't reach the live service. Check your connection and try again.");
      this.ws.onclose = (ev) => {
        if (!this.closed) this.fail(ev.reason || "The live call was closed by the service. Try again.");
      };
    } catch (e) {
      this.fail(describeStartError(e, this.prompt.lang ?? "en"));
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
      } else if (ev.type === "toolCall") this.handleToolCalls(ev.calls);
      else if (ev.type === "audio") this.play(ev.pcm);
      else if (ev.type === "interrupted") this.stopPlayback();
      else if (ev.type === "heard") this.handlers.onHeard?.(ev.text);
      else if (ev.type === "said") this.handlers.onSaid?.(ev.text);
      else if (ev.type === "turnComplete") this.handlers.onSpeaking?.(false);
    }
  }

  private handleToolCalls(calls: LiveToolCall[]) {
    for (const c of calls) {
      if (c.name === "log_correction") this.handlers.onCorrection?.(normalizeCorrection(c.args));
      if (c.name === "submit_rating") this.handlers.onRating?.(normalizeExaminerRating(c.args));
    }
    // El modelo espera confirmación para seguir hablando.
    this.ws?.send(
      JSON.stringify({
        toolResponse: { functionResponses: calls.map((c) => ({ id: c.id, name: c.name, response: { result: "logged" } })) },
      })
    );
  }

  private async startMic() {
    if (!this.ctx || !this.stream) return;
    await this.ctx.audioWorklet.addModule(WORKLET_URL);
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
