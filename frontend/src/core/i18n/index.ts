import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources, type LanguageCode } from "./resources";

export const TEMP_LANGUAGE_KEY = "sdf.pendingLocale";

function validLanguage(value: string | null | undefined): value is LanguageCode {
  return value === "en" || value === "pt-BR" || value === "ko";
}

const pending = typeof window === "undefined" ? null : window.sessionStorage.getItem(TEMP_LANGUAGE_KEY);

void i18n.use(initReactI18next).init({
  resources,
  lng: validLanguage(pending) ? pending : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function localeForLanguage(language: string) {
  return language === "pt-BR" ? "pt-BR" : language === "ko" ? "ko-KR" : "en-US";
}

export function languageCode(value: string | undefined): LanguageCode {
  return validLanguage(value) ? value : "en";
}

export default i18n;
