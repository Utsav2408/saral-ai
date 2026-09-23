"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorPanel } from "@/components/ErrorPanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { OVERVIEW_ACTIVITY_CARDS } from "@/lib/activities/registry";
import { sessionExpiredHomeHref } from "@/lib/client/fetch-activity";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { MessageKey } from "@/lib/i18n/messages";
import { parseWithSchema, sessionPublicSchema } from "@/lib/schemas/session";
import type { SessionPublic } from "@/types/session";

function formatDeposit(facts: SessionPublic["facts"]): string {
  if (facts.depositAmount == null) return "—";
  const amount = facts.depositAmount.toLocaleString("en-IN");
  return `₹${amount}`;
}

const ACTIVITY_TITLE_KEY: Record<
  (typeof OVERVIEW_ACTIVITY_CARDS)[number]["id"],
  MessageKey
> = {
  chat: "activity.chat.title",
  simplify: "activity.simplify.title",
  summary: "activity.summary.title",
  options: "activity.options.title",
};

const ACTIVITY_DESC_KEY: Record<
  (typeof OVERVIEW_ACTIVITY_CARDS)[number]["id"],
  MessageKey
> = {
  chat: "activity.chat.description",
  simplify: "activity.simplify.description",
  summary: "activity.summary.description",
  options: "activity.options.description",
};

/**
 * Overview — shows extracted facts and parsed clauses for the current session.
 */
export default function OverviewPage() {
  const router = useRouter();
  const { t } = useLocale();
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
        const raw: unknown = await res.json();
        if (cancelled) return;
        if (
          !res.ok ||
          (raw && typeof raw === "object" && raw !== null && "error" in raw)
        ) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          router.replace(sessionExpiredHomeHref());
          return;
        }
        const parsed = parseWithSchema(sessionPublicSchema, raw);
        if (!parsed.ok) {
          setError(t("overview.loadError"));
          return;
        }
        setSession(parsed.data);
      } catch {
        if (!cancelled) {
          setError(t("overview.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  function regimeBanner(state?: string): string | null {
    if (!state) return null;
    if (state === "Maharashtra") return t("overview.regime.mh");
    if (state === "Uttar Pradesh") return t("overview.regime.up");
    return t("overview.regime.other", { state });
  }

  if (loading && !error) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-full max-w-md items-center justify-center px-5 py-16 text-ink-muted"
      >
        {t("overview.loading")}
      </main>
    );
  }

  if (error || !session) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16"
      >
        <ErrorPanel
          message={error ?? t("overview.notFound")}
          showHomeLink
        />
      </main>
    );
  }

  const subtitle = [
    session.facts.state,
    session.facts.propertyType ?? t("overview.residential"),
  ]
    .filter(Boolean)
    .join(" · ");

  const banner = regimeBanner(session.facts.state);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col px-5 pb-12 pt-6"
    >
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-lg px-2 py-1 text-lg text-ink"
          aria-label={t("overview.backHome")}
        >
          ‹
        </Link>
        <LanguageToggle />
      </header>

      <h1 className="font-display text-2xl font-bold leading-snug text-ink">
        {session.title}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <FactCard label={t("overview.deposit")} value={formatDeposit(session.facts)} />
        <FactCard
          label={t("overview.leaseStart")}
          value={session.facts.leaseStart ?? "—"}
        />
        <FactCard
          label={t("overview.notice")}
          value={session.facts.noticePeriod ?? "—"}
        />
      </div>

      {banner ? (
        <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-ink">
          {banner}
        </p>
      ) : null}

      <h2 className="mt-8 text-base font-semibold text-ink">
        {t("overview.whatNext")}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {OVERVIEW_ACTIVITY_CARDS.map((card) => (
          <ActivityCard
            key={card.id}
            title={t(ACTIVITY_TITLE_KEY[card.id])}
            description={t(ACTIVITY_DESC_KEY[card.id])}
            href={card.href}
          />
        ))}
      </div>

      <section className="mt-8" aria-labelledby="clauses-heading">
        <h2 id="clauses-heading" className="text-base font-semibold text-ink">
          {t("overview.clauses", { count: session.clauseCount })}
        </h2>
        <ul className="mt-3 space-y-2">
          {session.clauses.map((clause) => {
            const isOpen = expanded === clause.id;
            const panelId = `clause-panel-${clause.id}`;
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
                  aria-controls={panelId}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {t("overview.clause", { index: clause.index })}
                    {clause.heading ? ` · ${clause.heading}` : ""}
                  </span>
                  <p
                    id={panelId}
                    className="mt-1 text-sm text-ink whitespace-pre-wrap"
                  >
                    {isOpen ? clause.text : preview}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
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
  href: string;
}) {
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
