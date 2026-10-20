import { useEffect } from "react";

/**
 * Hace que el botón "atrás" del navegador o del celular cierre la vista interna
 * abierta (lector, detalle, práctica) en vez de salir de la página.
 *
 * Mientras `open` es true se agrega una entrada al historial. Al tocar atrás,
 * se llama a `onClose`. Si la vista se cierra desde la propia pantalla, se
 * retira esa entrada para no dejar pasos fantasma.
 */
export function useHistoryBack(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const marker = { babelitoView: Math.random().toString(36).slice(2) };
    window.history.pushState({ ...(window.history.state ?? {}), ...marker }, "");

    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      onClose();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // Si la vista se cerró con un botón de la pantalla, quitamos la entrada
      // que agregamos. Solo retrocedemos si el historial sigue en nuestro paso.
      if (!closedByBack && window.history.state?.babelitoView === marker.babelitoView) {
        window.history.back();
      }
    };
    // onClose cambia en cada render; el efecto solo debe reaccionar a `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
