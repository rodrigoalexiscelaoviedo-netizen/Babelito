// Wrappers finos sobre la Web Speech API (nativa del navegador, gratis).
// STT = reconocimiento de voz; TTS = lectura en voz alta.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
  /** Returns the last interim (unfinished) transcript at any point in time. */
  getInterim: () => string;
}

export interface SpeakOptions {
  voiceName?: string;
  rate?: number;
  lang?: string;
}

/**
 * Devuelve las voces disponibles en el dispositivo, opcionalmente filtradas
 * por prefijo de idioma (ej: "en-GB", "en-US", "en").
 */
export function getVoices(langPrefix?: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (!langPrefix) return voices;
  return voices.filter((v) => v.lang.startsWith(langPrefix));
}

/**
 * Reconocedor de voz por turno, robusto en mobile Chrome. Motor ÚNICO para
 * todos los consumidores tipo-turno (Talk, Roleplay, Shadowing vía useTurnRecorder,
 * pronunciation). Tolera pausas dentro de un turno y termina de forma determinística.
 *
 * Garantías de robustez (aprendidas de los bugs de mobile):
 *  - Salida terminal desacoplada de onend: stop() vuelca el resultado
 *    sincrónicamente desde el acumulador (flushAndEnd), promoviendo el interim
 *    pendiente a final. NO depende de que el browser dispare onend tras stop()
 *    — en mobile a veces no lo hace, lo que colgaba a Shadowing en "Listening…".
 *  - Teardown con abort() + handlers desconectados: libera el engine para que
 *    el SIGUIENTE turno pueda capturar (con stop() solo, mobile no lo suelta y
 *    el 2º uso del mic quedaba mudo).
 *  - Restart resiliente: si Chrome cierra por silencio, reinicia para tolerar
 *    pausas; si el start() del restart tira, recrea una instancia fresca; si
 *    todo falla, cierra el turno con lo acumulado en vez de morir en silencio.
 *  - Reset total de estado en cada start(): cero arrastre entre turnos.
 *
 * Dedup de duplicación: lastFinalIndex (por-instancia) descarta re-fires de
 * Chrome dentro de una sesión; lastFinalTail + stripLeadingOverlap recortan la
 * palabra que el motor repite en el límite entre dos finals (entre instancias).
 *
 * - onResult: por cada segmento final (el caller acumula en su propio ref).
 * - onInterim: texto provisional mientras el usuario habla.
 * - onEnd: se dispara UNA vez, al terminar el turno (stop() o restart fallido).
 */
function normWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Chrome mobile a veces re-pronuncia la(s) última(s) palabra(s) de un
 * segmento final al principio del siguiente final (distinto índice, mismo
 * contenido) — no es re-procesamiento de un resultado ya visto (eso lo
 * cubre lastFinalIndex), es el motor de reconocimiento duplicando texto
 * en el límite entre dos finals. Se detecta comparando la cola del texto
 * ya emitido contra la cabeza del nuevo segmento y se recorta el solape.
 */
function stripLeadingOverlap(prevTail: string, next: string): string {
  const prevWords = prevTail.trim().split(/\s+/).filter(Boolean);
  const nextWords = next.trim().split(/\s+/).filter(Boolean);
  if (!prevWords.length || !nextWords.length) return next;
  const maxK = Math.min(5, prevWords.length, nextWords.length);
  for (let k = maxK; k >= 1; k--) {
    const prevEnd = prevWords.slice(-k).map(normWord);
    const nextStart = nextWords.slice(0, k).map(normWord);
    if (prevEnd.every((w, idx) => w.length > 0 && w === nextStart[idx])) {
      return nextWords.slice(k).join(" ");
    }
  }
  return next;
}

export function createRecognizer(opts: {
  lang?: string;
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  onEnd?: () => void;
}): Recognizer | null {
  const SR: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  // ── Estado del turno (vive a través de todos los restarts) ────────────────
  let rec: any        = null;  // instancia SR actual (se recrea en cada restart)
  let manualStop      = false; // true una vez que el usuario tocó Done/Listo
  let endFired        = false; // onEnd ya se disparó (idempotencia)
  let lastInterim     = "";    // interim más reciente aún no finalizado
  let lastFinalTail   = "";    // último segmento final crudo, para recortar solape

  // Vuelca el resultado terminal SIN depender de que el browser dispare onend.
  // Mobile Chrome a veces no dispara onend tras stop() (o el loop de restart
  // muere), así que este es el único punto de salida y se llama sincrónicamente
  // desde stop(). Antes de terminar, promueve cualquier interim pendiente a
  // final para no perder la última frase si Chrome nunca emitió isFinal.
  const flushAndEnd = () => {
    if (endFired) return;
    if (lastInterim.trim()) {
      const t = stripLeadingOverlap(lastFinalTail, lastInterim).trim();
      lastFinalTail = lastInterim;
      lastInterim = "";
      if (t) { console.log(`[createRecognizer] flush interim → onResult("${t}")`); opts.onResult(t); }
    }
    endFired = true;
    console.log("[createRecognizer] → onEnd fired");
    opts.onEnd?.();
  };

  // Construye una instancia SR fresca con todos sus handlers.
  // lastFinalIndex es POR-instancia: dedup de re-fires de Chrome dentro de la
  // misma sesión. El dedup entre instancias lo cubre lastFinalTail (solape).
  function buildInstance() {
    const r: any = new SR();
    r.lang           = opts.lang ?? "en-GB";
    r.continuous     = true;
    r.interimResults = true;
    let lastFinalIndex = -1;

    r.onstart       = () => console.log("[createRecognizer] onstart");
    r.onaudiostart  = () => console.log("[createRecognizer] onaudiostart — mic open");
    r.onspeechstart = () => console.log("[createRecognizer] onspeechstart — voice detected");
    r.onspeechend   = () => console.log("[createRecognizer] onspeechend");
    r.onaudioend    = () => console.log("[createRecognizer] onaudioend");

    r.onresult = (e: any) => {
      console.log(`[createRecognizer] onresult — resultIndex=${e.resultIndex} results.length=${e.results.length} lastFinalIndex=${lastFinalIndex}`);
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        const isFin = e.results[i].isFinal;
        console.log(`  [${i}] ${isFin ? "FINAL" : "interim"}: "${transcript}" (skip=${isFin && i <= lastFinalIndex})`);
        if (isFin) {
          // Skip cualquier final ya emitido (Chrome re-emite entries viejas
          // tras un restart de misma instancia en mobile).
          if (i > lastFinalIndex) {
            lastFinalIndex = i;
            const trimmed = stripLeadingOverlap(lastFinalTail, transcript);
            if (trimmed !== transcript) {
              console.log(`[createRecognizer] → trimmed boundary overlap: "${transcript}" → "${trimmed}"`);
            }
            lastFinalTail = transcript;
            final += (final && trimmed ? " " : "") + trimmed;
          }
        } else {
          interim += transcript;
        }
      }
      if (interim) { lastInterim = interim; opts.onInterim?.(interim); }
      if (final)   { lastInterim = ""; console.log(`[createRecognizer] → calling onResult("${final}")`); opts.onResult(final); }
    };

    r.onerror = (e: any) => {
      console.log(`[createRecognizer] onerror — error="${e.error}"`);
      // no-speech / audio-capture / aborted son transitorios → dejar que onend
      // decida (restart). Cualquier otro error es fatal → terminar el turno.
      if (e.error !== "no-speech" && e.error !== "audio-capture" && e.error !== "aborted") {
        manualStop = true;
      }
    };

    r.onend = () => {
      console.log(`[createRecognizer] onend — manualStop=${manualStop}`);
      if (manualStop) { flushAndEnd(); return; }
      // Fin natural dentro del turno (silencio en mobile): reiniciar para
      // tolerar pausas. Si el restart falla, terminar limpio en vez de colgar.
      restart();
    };

    return r;
  }

  // Restart resiliente: intenta misma instancia; si tira, recrea una fresca;
  // si eso también falla, cierra el turno con lo acumulado (nunca cuelga).
  function restart() {
    if (manualStop) return;
    try {
      rec.start();
      console.log("[createRecognizer] → restart (same instance)");
    } catch {
      try {
        rec = buildInstance();
        rec.start();
        console.log("[createRecognizer] → restart (fresh instance)");
      } catch (e) {
        console.error("[createRecognizer] → restart failed, ending turn", e);
        flushAndEnd();
      }
    }
  }

  return {
    start: () => {
      // Reset TOTAL de estado: cero arrastre entre turnos consecutivos.
      manualStop    = false;
      endFired      = false;
      lastInterim   = "";
      lastFinalTail = "";
      rec = buildInstance();
      try { rec.start(); } catch (e) { console.error("[createRecognizer] start() threw:", e); }
    },
    stop: () => {
      // Teardown determinístico: desconectar handlers y abort() para LIBERAR
      // el engine (mobile no lo suelta con stop() solo → el 2º turno no captura),
      // luego disparar el resultado terminal sincrónicamente (sin esperar onend).
      manualStop = true;
      const dying = rec;
      rec = null;
      if (dying) {
        dying.onresult = null;
        dying.onerror  = null;
        dying.onend    = null;
        try { dying.stop();  } catch { /* not running */ }
        try { dying.abort(); } catch { /* not running */ }
      }
      flushAndEnd();
    },
    getInterim: () => lastInterim,
  };
}

/**
 * Lee un texto en voz alta. Acepta un string de lang (backward compatible)
 * o un objeto SpeakOptions con voiceName, rate y lang opcionales.
 */
export function speak(text: string, langOrOpts: string | SpeakOptions = "en-GB") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const clean = text
    .replace(/\*\*/g, "")
    .replace(/→/g, "")
    .replace(/<<ERRORS:[^>]*>>/gi, "");

  let lang = "en-GB";
  let rate = 0.95;
  let voiceName: string | undefined;

  if (typeof langOrOpts === "string") {
    lang = langOrOpts;
  } else {
    lang = langOrOpts.lang ?? "en-GB";
    rate = langOrOpts.rate ?? 0.95;
    voiceName = langOrOpts.voiceName;
  }

  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang;
  u.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  let voice: SpeechSynthesisVoice | undefined;
  if (voiceName) {
    voice = voices.find((v) => v.name === voiceName);
  }
  if (!voice) {
    voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith("en"));
  }
  if (voice) u.voice = voice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Pausa la narración en curso. En Chrome Android puede ser inestable. */
export function pauseSpeech() {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
  } catch {
    /* inestable en algunos navegadores */
  }
}

/** Reanuda la narración pausada. En Chrome Android puede ser inestable. */
export function resumeSpeech() {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  } catch {
    /* inestable en algunos navegadores */
  }
}
