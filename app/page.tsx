"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { ErrorPanel } from "@/components/ErrorPanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { mapApiErrorFromBody } from "@/lib/api/map-api-error";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import { greetingKey } from "@/lib/i18n/messages";
import type { UploadResponse } from "@/types/session";

/**
 * Home screen — upload PDF/TXT and hand off session token via sessionStorage.
 */
function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = searchParams.get("reason") === "expired";
  const greeting = useMemo(
    () => t(greetingKey(new Date().getHours())),
    [t],
  );

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as
        | UploadResponse
        | { error: { code: string; message: string } };

      if (!res.ok || "error" in data) {
        setError(
          mapApiErrorFromBody(
            res.status,
            data,
            t("home.upload.error"),
          ),
        );
        return;
      }

      sessionStorage.setItem(SESSION_STORAGE_KEY, data.token);
      router.push("/overview");
    } catch {
      setError(t("home.upload.offline"));
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col px-5 pb-12 pt-8"
    >
      <header className="mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{greeting}</p>
          <h1 className="font-display mt-1 text-3xl font-bold leading-tight text-ink">
            {t("home.title")}
          </h1>
        </div>
        <LanguageToggle />
      </header>

      {expired ? (
        <p
          role="status"
          className="mb-4 rounded-lg bg-primary-soft px-3 py-2 text-sm text-ink"
        >
          {t("home.expired")}
        </p>
      ) : null}

      <section
        className="rounded-2xl border border-dashed border-primary/40 bg-card p-5 shadow-sm"
        aria-labelledby="upload-heading"
      >
        <h2 id="upload-heading" className="text-lg font-semibold text-ink">
          {t("home.upload.heading")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t("home.upload.hint")}</p>

        <div className="mt-5 flex flex-col gap-3">
          <label htmlFor="lease-file" className="sr-only">
            {t("home.upload.chooseAria")}
          </label>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label={t("home.upload.chooseAria")}
          >
            {busy ? t("home.upload.reading") : t("home.upload.choose")}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm font-semibold text-ink-muted"
            disabled
            aria-label={t("home.upload.photoAria")}
            title={t("home.upload.photo")}
          >
            {t("home.upload.photo")}
          </button>
        </div>

        <input
          id="lease-file"
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={(e) => void onFileChange(e.target.files?.[0])}
        />

        <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
          <span aria-hidden="true">🔒</span>
          <span>{t("home.upload.privacy")}</span>
        </p>

        {error ? (
          <div className="mt-4">
            <ErrorPanel message={error} />
          </div>
        ) : null}
      </section>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("home.afterUpload")}
      </p>

      <section className="mt-10" aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted"
        >
          {t("home.recent")}
        </h2>
        <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-ink-muted">
          {t("home.recent.empty")}
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <HomeFallback />
      }
    >
      <HomePageInner />
    </Suspense>
  );
}

function HomeFallback() {
  const { t } = useLocale();
  return (
    <main
      id="main"
      className="mx-auto flex min-h-full max-w-md items-center justify-center px-5 py-16 text-ink-muted"
    >
      {t("home.loading")}
    </main>
  );
}
