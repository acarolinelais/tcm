import i18n from "./index";
import { localeForLanguage } from "./index";

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeForLanguage(i18n.resolvedLanguage ?? "en"), options).format(value);
}

export function formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(localeForLanguage(i18n.resolvedLanguage ?? "en"), options).format(new Date(value));
}
