/**
 * Shared chrome for activity pages (loading / error shells + header).
 */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorPanel } from "@/components/ErrorPanel";
import { useLocale } from "@/components/LocaleProvider";

const MAIN_CLASS =
  "mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16";

/** Centered loading message while an activity POST is in flight. */
export function ActivityLoading({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-full max-w-md items-center justify-center px-5 py-16 text-ink-muted"
    >
      {children}
    </main>
  );
}

/** Error shell with optional Retry / Overview / Home links. */
export function ActivityError({
  message,
  onRetry,
  showHomeLink = false,
}: {
  message: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
}) {
  return (
    <main id="main" className={MAIN_CLASS}>
      <ErrorPanel
        message={message}
        onRetry={onRetry}
        showOverviewLink
        showHomeLink={showHomeLink}
      />
    </main>
  );
}

/** Page content column shared by activity screens. */
export function ActivityMain({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto min-h-full w-full max-w-md px-5 pb-16 pt-6"
    >
      {children}
    </main>
  );
}

type ActivityHeaderProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Larger display title (Simplify); default is compact. */
  large?: boolean;
  /** Optional trailing control (e.g. language toggle). */
  end?: ReactNode;
};

/** Back-to-overview header used on every activity screen. */
export function ActivityHeader({
  title,
  subtitle,
  meta,
  large = false,
  end,
}: ActivityHeaderProps) {
  const { t } = useLocale();
  return (
    <header className="flex items-start gap-3">
      <Link
        href="/overview"
        aria-label={t("chrome.backOverview")}
        className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
      >
        <ChevronLeft />
      </Link>
      <div className="min-w-0 flex-1">
        <h1
          className={
            large
              ? "font-display text-3xl font-bold tracking-tight text-ink"
              : "text-xl font-semibold text-ink"
          }
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 truncate text-sm text-ink-muted">{subtitle}</p>
        ) : null}
        {meta ? <p className="mt-1 text-xs text-ink-muted">{meta}</p> : null}
      </div>
      {end ? <div className="mt-1 shrink-0">{end}</div> : null}
    </header>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12.5 4.5L7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
