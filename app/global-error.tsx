"use client";

/**
 * Root layout error boundary — must define its own html/body.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#f7f4ef",
          color: "#1a1a1a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "24rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.75, marginBottom: "1rem" }}>
            Please try again, or refresh the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#1b4d3e",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
