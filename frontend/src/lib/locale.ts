import type { AppLanguage } from "../store/preferencesStore";

export const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  uk: "uk-UA",
  en: "en-US",
};

export function formatCurrency(value: string | number, language: AppLanguage) {
  return new Intl.NumberFormat(LOCALE_BY_LANGUAGE[language], {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDateTime(
  value: string,
  language: AppLanguage,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
    dateStyle: "long",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
}

export function formatTime(value: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
    dateStyle: "medium",
  }).format(new Date(value));
}
