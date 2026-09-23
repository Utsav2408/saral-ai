/**
 * Client locale context — persists en/hi, syncs <html lang>, exposes t().
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_HTML_LANG,
  LOCALE_STORAGE_KEY,
  nextLocale,
  parseLocale,
  type Locale,
} from "@/lib/i18n/locale";
import {
  translate,
  type MessageKey,
  type MessageVars,
} from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey, vars?: MessageVars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Same-tab subscribers — `storage` events only fire across tabs. */
const listeners = new Set<() => void>();

/** In-memory fallback when localStorage is unavailable (private mode). */
let memoryLocale: Locale | null = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

function readStoredLocale(): Locale {
  if (memoryLocale !== null) return memoryLocale;
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

function writeLocale(locale: Locale) {
  memoryLocale = locale;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode — preference stays in-memory for this tab */
  }
  emitChange();
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    readStoredLocale,
    getServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeLocale(parseLocale(next));
  }, []);

  const toggleLocale = useCallback(() => {
    writeLocale(nextLocale(readStoredLocale()));
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * Access locale + translator. Must be under {@link LocaleProvider}.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
