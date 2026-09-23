import Link from "next/link";

/**
 * 404 page — calm copy, link home.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Page not found</h1>
      <p className="text-sm text-ink-muted">
        That link does not exist. Upload a lease from Home to get started.
      </p>
      <Link href="/" className="text-sm font-semibold text-primary underline">
        Back to Home
      </Link>
    </div>
  );
}
