import i18n from "./index";
import { localeForLanguage } from "./index";

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeForLanguage(i18n.resolvedLanguage ?? "en"), options).format(value);
}

export function formatList(values: string[], type: Intl.ListFormatType = "conjunction") {
  return new Intl.ListFormat(localeForLanguage(i18n.resolvedLanguage ?? "en"), { type }).format(values);
}

export function formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(localeForLanguage(i18n.resolvedLanguage ?? "en"), options).format(new Date(value));
}
