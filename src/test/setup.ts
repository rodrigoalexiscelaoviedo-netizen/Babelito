import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom no implementa estos métodos de desplazamiento; el chat los usa para bajar al último mensaje.
if (typeof Element !== "undefined") {
  Element.prototype.scrollTo ??= function scrollTo() {};
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
}

// Cada prueba de pantalla arranca con el DOM limpio.
afterEach(() => {
  cleanup();
});
