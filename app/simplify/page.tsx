"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/session/${encodeURIComponent(token)}/simplify`,
          { method: "POST" },
        );
        const body = (await res.json()) as
          | SimplifyResponse
          | { error: { code: string; message: string } };
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          if (res.status === 404) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
          setError(
            "error" in body
              ? body.error.message
              : "Could not simplify this document.",
          );
          return;
        }
        setData(body);
      } catch {
        if (!cancelled) {
          setError("Could not simplify this document. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading && !error) {
    return (
      <div className="mx-auto flex min-h-full max-w-md items-center justify-center px-5 py-16 text-ink-muted">
        Simplifying your lease…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16">
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm">
          {error ?? "Something went wrong."}
        </p>
        <Link
          href="/overview"
          className="text-sm font-semibold text-primary underline"
        >
          Back to Overview
        </Link>
      </div>
    );
  }

  const byId = new Map(
    data.simplifiedClauses.map((s) => [s.clauseId, s.simpleText]),
  );

  return (
    <div className="mx-auto min-h-full w-full max-w-md px-5 pb-16 pt-6">
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
      >
        <ViewTab
          selected={view === "plain"}
          onSelect={() => setView("plain")}
          label="Plain language"
        />
        <ViewTab
          selected={view === "original"}
          onSelect={() => setView("original")}
          label="Original text"
        />
      </div>

      <ul className="mt-6 space-y-3">
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
    </div>
  );
}

function ViewTab({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
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
