/**
 * Compact language control — toggles English ↔ हिन्दी.
 */

"use client";

import { useLocale } from "@/components/LocaleProvider";
import { LOCALE_LABELS } from "@/lib/i18n/locale";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale, toggleLocale, t } = useLocale();
  const label = LOCALE_LABELS[locale];

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={
        className ??
        "shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink"
      }
      aria-label={t("lang.aria", { label })}
    >
      {label}
    </button>
  );
}
