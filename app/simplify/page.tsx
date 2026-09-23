"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorPanel } from "@/components/ErrorPanel";
import {
  fetchActivityOnce,
  sessionExpiredHomeHref,
} from "@/lib/client/fetch-activity";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { SimplifyResponse } from "@/types/session";

type ViewMode = "plain" | "original";

/**
 * Simplify — plain-language paraphrases with toggle back to original text.
 */
export default function SimplifyPage() {
  const router = useRouter();
  const [data, setData] = useState<SimplifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("plain");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await fetchActivityOnce<SimplifyResponse>(
        `/api/session/${encodeURIComponent(token)}/simplify`,
        "Could not simplify this document. Please try again.",
      );
      if (cancelled) return;
      if (!result.ok) {
        if (result.expired) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          router.replace(sessionExpiredHomeHref());
          return;
        }
        setError(result.message);
        setLoading(false);
        return;
      }
      setData(result.data);
      setError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, retryKey]);

  if (loading && !error) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-full max-w-md items-center justify-center px-5 py-16 text-ink-muted"
      >
        Simplifying your lease…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16"
      >
        <ErrorPanel
          message={error ?? "Something went wrong."}
          onRetry={() => {
            setError(null);
            setData(null);
            setLoading(true);
            setRetryKey((k) => k + 1);
          }}
          showOverviewLink
        />
      </main>
    );
  }

  const byId = new Map(
    data.simplifiedClauses.map((s) => [s.clauseId, s.simpleText]),
  );

  return (
    <main id="main" className="mx-auto min-h-full w-full max-w-md px-5 pb-16 pt-6">
      <header className="flex items-start gap-3">
        <Link
          href="/overview"
          aria-label="Back to overview"
          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Simplified
          </h1>
          <p className="mt-1 truncate text-sm text-ink-muted">{data.title}</p>
        </div>
      </header>

      <div
        className="mt-6 flex rounded-full border border-border bg-card p-1"
        role="tablist"
        aria-label="Text view"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            setView((v) => (v === "plain" ? "original" : "plain"));
          }
        }}
      >
        <ViewTab
          id="tab-plain"
          panelId="panel-clauses"
          selected={view === "plain"}
          onSelect={() => setView("plain")}
          label="Plain language"
        />
        <ViewTab
          id="tab-original"
          panelId="panel-clauses"
          selected={view === "original"}
          onSelect={() => setView("original")}
          label="Original text"
        />
      </div>

      <ul
        id="panel-clauses"
        role="tabpanel"
        aria-labelledby={view === "plain" ? "tab-plain" : "tab-original"}
        className="mt-6 space-y-3"
      >
        {data.clauses.map((clause) => {
          const plain = byId.get(clause.id);
          const body =
            view === "plain" && plain != null ? plain : clause.text;
          const title =
            clause.heading?.trim() ||
            (view === "plain" ? "Clause" : `Clause ${clause.index}`);

          return (
            <li
              key={clause.id}
              className="rounded-2xl border border-border bg-card px-4 py-4"
            >
              <span className="inline-block rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                Clause {clause.index}
              </span>
              {clause.heading ? (
                <h2 className="mt-2 text-base font-semibold text-ink">
                  {clause.heading}
                </h2>
              ) : (
                <h2 className="mt-2 text-base font-semibold text-ink">
                  {title}
                </h2>
              )}
              <p className="mt-2 text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {body}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function ViewTab({
  id,
  panelId,
  selected,
  onSelect,
  label,
}: {
  id: string;
  panelId: string;
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={
        selected
          ? "flex-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white"
          : "flex-1 rounded-full px-3 py-2 text-sm font-semibold text-ink-muted"
      }
    >
      {label}
    </button>
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
