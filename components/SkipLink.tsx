"use client";

import { useLocale } from "@/components/LocaleProvider";

/** Focusable skip link; label follows UI locale. */
export function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
    >
      {t("skip.main")}
    </a>
  );
}
