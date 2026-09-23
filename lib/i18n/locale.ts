/**
 * UI + GenAI output locale (English / Hindi).
 * Persisted in localStorage; sent to Simplify / Chat as `locale`.
 */

export const LOCALES = ["en", "hi"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** localStorage key for the user's language preference. */
export const LOCALE_STORAGE_KEY = "clarity_locale";

/** BCP 47 tags for `<html lang>`. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  hi: "hi",
};

/** Short labels shown on the language control. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

/**
 * Coerce an unknown value to a supported locale.
 * Complexity: O(1).
 */
export function parseLocale(value: unknown): Locale {
  if (value === "hi" || value === "en") return value;
  return DEFAULT_LOCALE;
}

/** Next locale in the toggle cycle (en ↔ hi). */
export function nextLocale(current: Locale): Locale {
  return current === "en" ? "hi" : "en";
}

/**
 * Read locale from a JSON request body (`locale` field). Defaults to English.
 * Complexity: O(1).
 */
export function localeFromBody(body: unknown): Locale {
  if (
    typeof body === "object" &&
    body !== null &&
    "locale" in body
  ) {
    return parseLocale((body as { locale: unknown }).locale);
  }
  return DEFAULT_LOCALE;
}
