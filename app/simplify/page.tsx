"use client";

import { useState } from "react";
import {
  ActivityError,
  ActivityHeader,
  ActivityLoading,
  ActivityMain,
} from "@/components/ActivityChrome";
import { useActivityLoad } from "@/lib/client/use-activity-load";
import type { SimplifyResponse } from "@/types/session";

type ViewMode = "plain" | "original";

/**
 * Simplify — plain-language paraphrases with toggle back to original text.
 */
export default function SimplifyPage() {
  const { data, error, loading, retry } = useActivityLoad<SimplifyResponse>(
    "simplify",
    "Could not simplify this document. Please try again.",
  );
  const [view, setView] = useState<ViewMode>("plain");

  if (loading && !error) {
    return <ActivityLoading>Simplifying your lease…</ActivityLoading>;
  }

  if (error || !data) {
    return (
      <ActivityError
        message={error ?? "Something went wrong."}
        onRetry={retry}
      />
    );
  }

  const byId = new Map(
    data.simplifiedClauses.map((s) => [s.clauseId, s.simpleText]),
  );

  return (
    <ActivityMain>
      <ActivityHeader title="Simplified" subtitle={data.title} large />

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
              <h2 className="mt-2 text-base font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {body}
              </p>
            </li>
          );
        })}
      </ul>
    </ActivityMain>
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
