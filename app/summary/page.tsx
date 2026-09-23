"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { SummaryResponse } from "@/types/session";

/**
 * Summary — key facts, conflict/gap flags, and an actionable checklist.
 */
export default function SummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          `/api/session/${encodeURIComponent(token)}/summary`,
          { method: "POST" },
        );
        const body = (await res.json()) as
          | SummaryResponse
          | { error: { code: string; message: string } };
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          if (res.status === 404) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
          setError(
            "error" in body
              ? body.error.message
              : "Could not summarize this document.",
          );
          return;
        }
        setData(body);
      } catch {
        if (!cancelled) {
          setError("Could not summarize this document. Please try again.");
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
        Building your summary…
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

  const descById = new Map(
    data.flagDescriptions.map((d) => [d.flagId, d.description]),
  );

  return (
    <div className="mx-auto min-h-full w-full max-w-md px-5 pb-16 pt-6">
      <header className="flex items-start gap-3">
        <Link
          href="/overview"
          aria-label="Back to overview"
          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-ink">Summary</h1>
          <p className="mt-1 text-sm text-ink-muted">{data.title}</p>
        </div>
      </header>

      <section className="mt-6" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="text-base font-semibold text-ink">
          Overview
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink whitespace-pre-wrap">
          {data.overview}
        </p>
      </section>

      {data.flags.length > 0 ? (
        <section className="mt-8" aria-labelledby="flags-heading">
          <h2 id="flags-heading" className="text-base font-semibold text-ink">
            Flags ({data.flags.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {data.flags.map((flag) => (
              <li
                key={flag.id}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {flag.severity} · {flag.ruleId.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-sm text-ink">
                  {descById.get(flag.id) ?? flag.summaryKey}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="checklist-heading">
        <h2 id="checklist-heading" className="text-base font-semibold text-ink">
          Checklist
        </h2>
        {data.checklist.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No checklist items for this lease.
          </p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {data.checklist.map((item) => (
              <li key={item.id} className="text-sm text-ink">
                <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                  {item.priority}
                </span>
                <p className="mt-0.5">{item.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {data.cached ? (
        <p className="mt-6 text-xs text-ink-muted">Loaded from session cache.</p>
      ) : null}
    </div>
  );
}
