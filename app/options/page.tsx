"use client";

import {
  ActivityError,
  ActivityHeader,
  ActivityLoading,
  ActivityMain,
} from "@/components/ActivityChrome";
import { CitationPills } from "@/components/CitationPills";
import { useActivityLoad } from "@/lib/client/use-activity-load";

/**
 * Options — escalation banner, RERA applicability, and next-step guidance.
 */
export default function OptionsPage() {
  const { data, error, loading, retry } = useActivityLoad(
    "options",
    "Could not load options. Please try again.",
  );

  if (loading && !error) {
    return <ActivityLoading>Figuring out your options…</ActivityLoading>;
  }

  if (error || !data) {
    return (
      <ActivityError
        message={error ?? "Something went wrong."}
        onRetry={retry}
      />
    );
  }

  return (
    <ActivityMain>
      <ActivityHeader
        title="Your options"
        subtitle={data.title}
        meta={data.regime.label}
      />

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
                <CitationPills citations={step.citations} />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {data.cached ? (
        <p className="mt-6 text-xs text-ink-muted">Loaded from session cache.</p>
      ) : null}
    </ActivityMain>
  );
}
