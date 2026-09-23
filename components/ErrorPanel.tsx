/**
 * Shared failure UI — calm alert + optional Retry / navigation CTAs.
 * Prefer this over ad-hoc `role="alert"` paragraphs so copy stays consistent.
 */

"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

type ErrorPanelProps = {
  /** User-safe message (already passed through {@link mapApiError}). */
  message: string;
  /** Optional retry handler for recoverable failures (429/502/503). */
  onRetry?: () => void;
  /** Show a link back to Overview. */
  showOverviewLink?: boolean;
  /** Show a link back to Home. */
  showHomeLink?: boolean;
  className?: string;
};

/**
 * Render an accessible error panel with optional recovery actions.
 */
export function ErrorPanel({
  message,
  onRetry,
  showOverviewLink = false,
  showHomeLink = false,
  className = "",
}: ErrorPanelProps) {
  const { t } = useLocale();
  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      <p
        role="alert"
        className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-ink"
      >
        {message}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            {t("error.retry")}
          </button>
        ) : null}
        {showOverviewLink ? (
          <Link
            href="/overview"
            className="text-sm font-semibold text-primary underline"
          >
            {t("error.backOverview")}
          </Link>
        ) : null}
        {showHomeLink ? (
          <Link
            href="/"
            className="text-sm font-semibold text-primary underline"
          >
            {t("error.backHome")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
