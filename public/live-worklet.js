// Captura del micrófono para la llamada en vivo (se carga como módulo de AudioWorklet).
// Va como archivo propio y no como Blob: la política de seguridad solo permite scripts de este origen.
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(new Float32Array(ch));
    return true;
  }
}
registerProcessor("babelito-capture", Capture);
