"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import { safeCitationHref } from "@/lib/chat/safe-citation-url";
import type { OptionsResponse } from "@/types/session";

/**
 * Options — escalation banner, RERA applicability, and next-step guidance.
 */
export default function OptionsPage() {
  const router = useRouter();
  const [data, setData] = useState<OptionsResponse | null>(null);
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
          `/api/session/${encodeURIComponent(token)}/options`,
          { method: "POST" },
        );
        const body = (await res.json()) as
          | OptionsResponse
          | { error: { code: string; message: string } };
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          if (res.status === 404) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
          setError(
            "error" in body
              ? body.error.message
              : "Could not load options for this document.",
          );
          return;
        }
        setData(body);
      } catch {
        if (!cancelled) {
          setError("Could not load options. Please try again.");
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
        Figuring out your options…
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
          <h1 className="text-xl font-semibold text-ink">Your options</h1>
          <p className="mt-1 text-sm text-ink-muted">{data.title}</p>
          <p className="mt-1 text-xs text-ink-muted">{data.regime.label}</p>
        </div>
      </header>

      {data.escalation ? (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-ink"
        >
          <p className="font-semibold">Seek qualified help</p>
          <p className="mt-1">
            This lease mentions criminal or active-litigation terms. Clarity
            does not give courtroom strategy — consider speaking with a
            qualified lawyer or the appropriate authority before acting.
          </p>
        </div>
      ) : null}

      <section className="mt-8" aria-labelledby="rera-heading">
        <h2 id="rera-heading" className="text-base font-semibold text-ink">
          RERA applicability
        </h2>
        <ul className="mt-3 space-y-2">
          {data.reraChecks.map((check) => (
            <li
              key={check.disputeType}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {check.applicable ? "May apply" : "Not applicable"} ·{" "}
                {check.disputeType.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-sm text-ink">{check.explanation}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="text-base font-semibold text-ink">
          Next steps
        </h2>
        <ol className="mt-3 space-y-3">
          {data.steps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Step {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-sm text-ink whitespace-pre-wrap">
                {step.body}
              </p>
              {step.citations && step.citations.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {step.citations.map((c) => {
                    const href = safeCitationHref(c.sourceUrl);
                    return (
                      <li key={`${step.id}-${c.id}`}>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {c.label}
                          </a>
                        ) : (
                          <span className="inline-block rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                            {c.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {data.cached ? (
        <p className="mt-6 text-xs text-ink-muted">Loaded from session cache.</p>
      ) : null}
    </div>
  );
}
