/**
 * Captura de voz — IMPLEMENTACIÓN CANÓNICA ÚNICA de toda la app.
 *
 * Reemplaza a useTurnRecorder, useSingleUtterance y createRecognizer (borrados).
 * Ningún módulo puede crear su propio SpeechRecognition ni mantener su propio
 * acumulador de texto: este archivo es la única fuente de verdad.
 *
 * ── REGLA DE ORO ──────────────────────────────────────────────────────────
 *   finalRef  → persiste todo el turno. Solo se le suman segmentos isFinal.
 *   interim   → se RECONSTRUYE DESDE CERO en cada evento onresult.
 *
 * Los resultados interinos son BORRADORES que se revisan: la Web Speech API
 * re-emite el mismo texto cada vez más largo hasta marcarlo isFinal. Si se
 * concatenan en vez de reemplazarse, se produce la "escalera":
 *   "yes my name is" / "yes my name is Rodrigo" / "yes my name is Rodrigo and"
 * que fue el bug de fondo en Talk y Roleplay.
 *
 * ── CICLO DE VIDA DE LA INSTANCIA ─────────────────────────────────────────
 *   start()  (gesto de usuario) → instancia NUEVA + reset total del estado.
 *   onend con manualStop=false  → restart de la MISMA instancia (nunca una
 *                                 nueva: fuera de un gesto de usuario Chrome
 *                                 Android deniega el mic en silencio —
 *                                 onstart dispara pero onaudiostart no).
 *   stop()   (gesto de usuario) → manualStop=true → onend → onDone(finalRef).
 *
 * Todos los handlers verifican identidad de instancia: una instancia superada
 * es un no-op total (causaba el "Listening..." infinito en shadowing).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { speechSupported } from "./speech";

export type SpeechCaptureMode = "turn" | "single";

export type SpeechDoneCallback = (finalText: string, errorCode?: string) => void;

export interface UseSpeechCapture {
  start: (onDone?: SpeechDoneCallback) => void;
  stop: () => void;
  isRecording: boolean;
  /** Borrador en vivo — solo para mostrar en pantalla. Nunca acumular. */
  interim: string;
  /** Acumulado confirmado del turno actual. */
  finalText: string;
  error: string | null;
  supported: boolean;
}

// ── Normalización y fusión de segmentos finales ────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Fusiona un segmento final nuevo con lo ya acumulado, resistiendo las tres
 * formas de duplicación que emite Chrome Android:
 *
 *  1. REVISIÓN ACUMULATIVA — el segmento nuevo contiene todo lo anterior más
 *     texto ("yes my name is" → "yes my name is Rodrigo"). Se REEMPLAZA, no se
 *     suma. Esta es la que producía la escalera.
 *  2. RE-ENTREGA — el segmento ya está al final de lo acumulado (Chrome re-emite
 *     resultados viejos tras un restart). Se descarta.
 *  3. SOLAPE DE BORDE — la última palabra del segmento previo se repite al
 *     inicio del nuevo ("nice to meet" + "meet you"). Se recorta el solape.
 */
function mergeFinal(acc: string, seg: string): string {
  const a = norm(acc);
  const s = norm(seg);
  if (!s) return acc;
  if (!a) return seg.trim();

  if (s.startsWith(a)) return seg.trim();            // 1. revisión acumulativa
  if (a.endsWith(s) || a.includes(s)) return acc;    // 2. re-entrega

  // 3. solape de borde: buscar el sufijo de acc que es prefijo de seg
  const aw = a.split(" ");
  const sw = s.split(" ");
  const segWords = seg.trim().split(/\s+/);
  const maxK = Math.min(8, aw.length, sw.length);
  for (let k = maxK; k >= 1; k--) {
    const tail = aw.slice(-k).join(" ");
    const head = sw.slice(0, k).join(" ");
    if (tail === head) return `${acc.trim()} ${segWords.slice(k).join(" ")}`.trim();
  }
  return `${acc.trim()} ${seg.trim()}`.trim();
}

// ── Motor (framework-agnóstico) ────────────────────────────────────────────

export interface SpeechSession {
  stop: () => void;
}

interface SessionOpts {
  lang?: string;
  mode?: SpeechCaptureMode;
  onInterim?: (draft: string) => void;
  onFinal?: (accumulated: string) => void;
  onError?: (code: string, fatal: boolean) => void;
  onDone: SpeechDoneCallback;
}

/**
 * Arranca una sesión de captura. Debe llamarse desde un gesto de usuario.
 * Devuelve null si el navegador no soporta SpeechRecognition.
 */
export function createSpeechSession(opts: SessionOpts): SpeechSession | null {
  const SR: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  const lang = opts.lang ?? "en-GB";
  const mode = opts.mode ?? "turn";

  let rec: any            = null;  // instancia viva (identidad para los guards)
  let finalText           = "";    // acumulado confirmado del turno
  let pendingInterim      = "";    // último borrador no finalizado
  let lastFinalIndex      = -1;    // anti re-emisión dentro de una misma sesión
  let manualStop          = false; // el usuario tocó Listo/Done
  let finished            = false; // onDone ya disparó (idempotencia)
  let errorCode: string | undefined;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const clearWatchdog = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };

  // Único punto de salida. Idempotente.
  const finish = () => {
    if (finished) return;
    finished = true;
    clearWatchdog();

    // Si Chrome nunca marcó isFinal, no perder la última frase.
    if (pendingInterim.trim()) {
      finalText = mergeFinal(finalText, pendingInterim);
      pendingInterim = "";
    }

    const dying = rec;
    rec = null;
    if (dying) {
      dying.onresult = null;
      dying.onerror  = null;
      dying.onend    = null;
      try { dying.abort(); } catch { /* ya detenida */ }
    }

    opts.onDone(finalText.trim(), errorCode);
  };

  // Cierra el turno si onend no llega (mobile a veces no lo dispara tras stop()).
  const armWatchdog = () => {
    clearWatchdog();
    watchdog = setTimeout(finish, 1500);
  };

  function attach(r: any) {
    r.lang            = lang;
    r.continuous      = true;
    r.interimResults  = true;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      if (rec !== r || finished) return;           // instancia superada → no-op

      let interimBuf = "";                          // ← RESET por evento. Crítico.
      let gotFinal = false;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0].transcript as string;
        if (res.isFinal) {
          if (i > lastFinalIndex) {
            lastFinalIndex = i;
            const merged = mergeFinal(finalText, txt);
            if (merged !== finalText) {
              finalText = merged;
              gotFinal = true;
            }
          }
        } else {
          interimBuf += txt;                        // acumula SOLO en este evento
        }
      }

      pendingInterim = interimBuf;
      opts.onInterim?.(interimBuf);                 // reemplaza, nunca concatena
      if (gotFinal) { pendingInterim = ""; opts.onFinal?.(finalText); }

      if (mode === "single" && gotFinal) {
        manualStop = true;
        try { r.stop(); } catch { finish(); }
      }
    };

    r.onerror = (e: any) => {
      if (rec !== r || finished) return;
      const code = e.error as string;
      // Transitorios: normales dentro de un turno, no molestar al usuario.
      if (code === "no-speech" || code === "aborted") return;
      errorCode = code;
      const fatal =
        code === "not-allowed" || code === "audio-capture" || code === "service-not-allowed";
      opts.onError?.(code, fatal);
      if (fatal) {
        manualStop = true;          // no reintentar: onend cerrará el turno
        armWatchdog();              // ...y si onend no llega, cerramos igual
      }
    };

    r.onend = () => {
      if (rec !== r || finished) return;
      if (manualStop) { finish(); return; }

      // Corte por silencio a mitad del turno → reiniciar la MISMA instancia.
      // Cada sesión nueva numera sus resultados desde cero, así que el guard de
      // índice se resetea; la de-duplicación entre sesiones la cubre mergeFinal.
      lastFinalIndex = -1;
      try { r.start(); } catch { finish(); }
    };
  }

  rec = new SR();
  attach(rec);
  try {
    rec.start();
  } catch {
    errorCode = "start-failed";
    setTimeout(finish, 0);          // async: el caller aún no tiene la sesión
  }

  return {
    stop: () => {
      if (finished) return;
      manualStop = true;
      const r = rec;
      if (!r) { finish(); return; }
      try { r.stop(); armWatchdog(); } catch { finish(); }
    },
  };
}

// ── Mensajes de error de cara al usuario ───────────────────────────────────

function errorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Micrófono bloqueado. Habilitá el permiso en el navegador.";
    case "audio-capture":
      return "No se detecta ningún micrófono.";
    case "network":
      return "Sin conexión para el reconocimiento de voz.";
    default:
      return null;                 // no-speech, aborted y demás: silencio
  }
}

// ── Hook público ───────────────────────────────────────────────────────────

/**
 * Mapea learning_language a código BCP47 para Web Speech API.
 * @param learningLanguage 'en' o 'ca' (de user.learning_language)
 * @param englishVariant opcional: 'American' o 'British' (solo aplica si learningLanguage === 'en')
 */
function getLangCode(learningLanguage: string, englishVariant?: string): string {
  if (learningLanguage === "en") {
    return englishVariant === "American" ? "en-US" : "en-GB";
  }
  if (learningLanguage === "ca") {
    return "ca-ES";
  }
  return "en-US"; // default fallback
}

export function useSpeechCapture(
  learningLanguage: string = "en",
  englishVariant?: string,
  opts: { mode?: SpeechCaptureMode } = {}
): UseSpeechCapture {
  const lang = getLangCode(learningLanguage, englishVariant);
  const { mode = "turn" } = opts;

  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim]         = useState("");
  const [finalText, setFinalText]     = useState("");
  const [error, setError]             = useState<string | null>(null);

  const sessionRef = useRef<SpeechSession | null>(null);
  const onDoneRef  = useRef<SpeechDoneCallback | null>(null);
  const supported  = speechSupported();

  const start = useCallback(
    (onDone?: SpeechDoneCallback) => {
      if (!supported) {
        setError("Este navegador no soporta reconocimiento de voz. Probá Chrome.");
        onDone?.("", "not-supported");
        return;
      }

      // Matar cualquier sesión previa. Nulificar la ref PRIMERO para que su
      // onDone se detecte como obsoleto y no resuelva este turno nuevo.
      const prev = sessionRef.current;
      if (prev) {
        sessionRef.current = null;
        onDoneRef.current  = null;
        prev.stop();
      }

      // Reset total: el 2º turno debe comportarse igual que el 1º.
      setInterim("");
      setFinalText("");
      setError(null);
      onDoneRef.current = onDone ?? null;

      let mine: SpeechSession | null = null;
      mine = createSpeechSession({
        lang,
        mode,
        onInterim: (draft) => { if (sessionRef.current === mine) setInterim(draft); },
        onFinal:   (acc)   => { if (sessionRef.current === mine) { setFinalText(acc); setInterim(""); } },
        onError:   (code)  => {
          if (sessionRef.current !== mine) return;
          const msg = errorMessage(code);
          if (msg) setError(msg);
        },
        onDone: (text, errCode) => {
          if (sessionRef.current !== mine) return;   // sesión superada → no-op
          sessionRef.current = null;
          setIsRecording(false);
          setInterim("");
          setFinalText(text);
          const cb = onDoneRef.current;
          onDoneRef.current = null;
          cb?.(text, errCode);
        },
      });

      if (!mine) {
        setError("Este navegador no soporta reconocimiento de voz. Probá Chrome.");
        onDoneRef.current = null;
        onDone?.("", "not-supported");
        return;
      }

      sessionRef.current = mine;
      setIsRecording(true);
    },
    [lang, mode, supported]
  );

  const stop = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  // Al desmontar: soltar el micrófono sin tocar estado de un componente muerto.
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      sessionRef.current = null;   // su onDone se vuelve no-op
      onDoneRef.current  = null;
      s?.stop();
    };
  }, []);

  return { start, stop, isRecording, interim, finalText, error, supported };
}
