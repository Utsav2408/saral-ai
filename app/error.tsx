"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary — calm fallback without stack traces.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Metadata only — never log document or chat content.
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        activity: "client_error",
        ok: false,
        code: "RENDER_ERROR",
        digest: error.digest ?? "none",
      }),
    );
  }, [error]);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">
        Something went wrong
      </h1>
      <p className="text-sm text-ink-muted">
        Please try again, or go back home and upload your lease again.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-sm font-semibold text-primary underline self-center"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
