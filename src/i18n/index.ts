import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ca } from "./ca";

export type UiLang = "en" | "ca";

/**
 * Idioma de la INTERFAZ. Sigue al idioma que se aprende: quien aprende catalán
 * ve la app en catalán; el resto, en inglés. (Las ayudas de comprensión siguen
 * en español, como indica la guía de estilo.)
 */
export function uiLang(learningLanguage?: string | null): UiLang {
  return learningLanguage === "ca" ? "ca" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ca: { translation: ca },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
});

export default i18n;
