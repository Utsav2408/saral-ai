"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import type { UploadResponse } from "@/types/session";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Home screen — upload PDF/TXT and hand off session token via sessionStorage.
 */
export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const greeting = useMemo(
    () => greetingForHour(new Date().getHours()),
    [],
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
        const message =
          "error" in data
            ? data.error.message
            : "Upload failed. Please try again.";
        setError(message);
        return;
      }

      sessionStorage.setItem(SESSION_STORAGE_KEY, data.token);
      router.push("/overview");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col px-5 pb-24 pt-8">
      <header className="mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{greeting}</p>
          <h1 className="font-display mt-1 text-3xl font-bold leading-tight text-ink">
            Let&apos;s look at your lease.
          </h1>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-ink-muted"
          aria-label="Language (English). Language switching comes later."
          disabled
        >
          English
        </button>
      </header>

      <section
        className="rounded-2xl border border-dashed border-primary/40 bg-card p-5 shadow-sm"
        aria-labelledby="upload-heading"
      >
        <h2 id="upload-heading" className="text-lg font-semibold text-ink">
          Add your document.
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          PDF or plain text — photo upload comes later.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Choose a PDF or text file"
          >
            {busy ? "Reading document…" : "Choose file"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm font-semibold text-primary/50"
            disabled
            aria-label="Take photo — coming in a later phase"
            title="Coming later"
          >
            Take photo (coming later)
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={(e) => void onFileChange(e.target.files?.[0])}
        />

        <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
          <span aria-hidden="true">🔒</span>
          <span>
            Processed in memory for this session only — nothing is saved to a
            database.
          </span>
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-ink"
          >
            {error}
          </p>
        ) : null}
      </section>

      <p className="mt-6 text-center text-sm text-ink-muted">
        No document handy? Ask a question anyway — available after upload in a
        later phase.
      </p>

      <section className="mt-10" aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted"
        >
          Recent
        </h2>
        <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-ink-muted">
          No saved documents — sessions end when you close this tab.
        </div>
      </section>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-md justify-around px-4 py-3 text-xs">
          <span className="font-semibold text-primary" aria-current="page">
            Home
          </span>
          <span className="text-ink-muted/60">Documents</span>
          <span className="text-ink-muted/60">Settings</span>
        </div>
      </nav>
    </div>
  );
}
