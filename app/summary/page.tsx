"use client";

import {
  ActivityError,
  ActivityHeader,
  ActivityLoading,
  ActivityMain,
} from "@/components/ActivityChrome";
import { useActivityLoad } from "@/lib/client/use-activity-load";

/**
 * Summary — key facts, conflict/gap flags, and an actionable checklist.
 */
export default function SummaryPage() {
  const { data, error, loading, retry } = useActivityLoad(
    "summary",
    "Could not summarize this document. Please try again.",
  );

  if (loading && !error) {
    return <ActivityLoading>Building your summary…</ActivityLoading>;
  }

  if (error || !data) {
    return (
      <ActivityError
        message={error ?? "Something went wrong."}
        onRetry={retry}
      />
    );
  }

  const descById = new Map(
    data.flagDescriptions.map((d) => [d.flagId, d.description]),
  );

  return (
    <ActivityMain>
      <ActivityHeader title="Summary" subtitle={data.title} />

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
    </ActivityMain>
  );
}
