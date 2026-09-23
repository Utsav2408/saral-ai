"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { SessionPublic } from "@/types/session";

function formatDeposit(facts: SessionPublic["facts"]): string {
  if (facts.depositAmount == null) return "—";
  const amount = facts.depositAmount.toLocaleString("en-IN");
  return `₹${amount}`;
}

function regimeCopy(state?: string): string | null {
  if (!state) return null;
  if (state === "Maharashtra") {
    return "Likely governed by the Maharashtra Rent Control Act — Chat can cite statute excerpts for this state.";
  }
  if (state === "Uttar Pradesh") {
    return "Likely governed by the UP Urban Premises Tenancy Act — Chat can cite statute excerpts for this state.";
  }
  return `State detected: ${state}. Chat will retrieve the closest available statute excerpts.`;
}

/**
 * Overview — shows extracted facts and parsed clauses for the current session.
 */
export default function OverviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
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
        const res = await fetch(`/api/session/${encodeURIComponent(token)}`);
        const data = (await res.json()) as
          | SessionPublic
          | { error: { code: string; message: string } };
        if (cancelled) return;
        if (!res.ok || "error" in data) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setError(
            "error" in data
              ? data.error.message
              : "Session expired. Please upload again.",
          );
          return;
        }
        setSession(data);
      } catch {
        if (!cancelled) {
          setError("Could not load your document. Please try again.");
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
        Loading overview…
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16">
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm">
          {error ?? "Session not found."}
        </p>
        <Link href="/" className="text-sm font-semibold text-primary underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const subtitle = [
    session.facts.state,
    session.facts.propertyType ?? "Residential lease",
  ]
    .filter(Boolean)
    .join(" · ");

  const banner = regimeCopy(session.facts.state);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col px-5 pb-12 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-lg px-2 py-1 text-lg text-ink"
          aria-label="Back to Home"
        >
          ‹
        </Link>
        <span className="text-sm text-ink-muted" aria-hidden="true">
          Aa
        </span>
      </header>

      <h1 className="font-display text-2xl font-bold leading-snug text-ink">
        {session.title}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <FactCard label="Deposit" value={formatDeposit(session.facts)} />
        <FactCard
          label="Lease start"
          value={session.facts.leaseStart ?? "—"}
        />
        <FactCard
          label="Notice"
          value={session.facts.noticePeriod ?? "—"}
        />
      </div>

      {banner ? (
        <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-ink">
          {banner}
        </p>
      ) : null}

      <h2 className="mt-8 text-base font-semibold text-ink">
        What would you like to do?
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ActivityCard
          title="Chat with it"
          description="Ask anything about your lease."
          href="/chat"
        />
        <ActivityCard
          title="Simplify it"
          description="Plain language, clause by clause."
          href="/simplify"
        />
        <ActivityCard
          title="Summary & checklist"
          description="Key facts, flags, to-dos."
          href="/summary"
        />
        <ActivityCard
          title="Your options"
          description="What you can do next."
          href="/options"
        />
      </div>

      <section className="mt-8" aria-labelledby="clauses-heading">
        <h2 id="clauses-heading" className="text-base font-semibold text-ink">
          Clauses ({session.clauseCount})
        </h2>
        <ul className="mt-3 space-y-2">
          {session.clauses.map((clause) => {
            const isOpen = expanded === clause.id;
            const preview =
              clause.text.length > 140
                ? `${clause.text.slice(0, 140)}…`
                : clause.text;
            return (
              <li key={clause.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left"
                  onClick={() =>
                    setExpanded(isOpen ? null : clause.id)
                  }
                  aria-expanded={isOpen}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Clause {clause.index}
                    {clause.heading ? ` · ${clause.heading}` : ""}
                  </span>
                  <p className="mt-1 text-sm text-ink whitespace-pre-wrap">
                    {isOpen ? clause.text : preview}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ActivityCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  /** When set, the card is an active link to that activity. */
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-border bg-card px-3 py-4 transition hover:border-primary hover:bg-primary-soft"
      >
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs text-ink-muted">{description}</p>
      </Link>
    );
  }

  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-4 opacity-70"
      aria-disabled="true"
      title="Coming in a later phase"
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-ink-muted">
        Next phase
      </p>
    </div>
  );
}
