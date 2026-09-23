/**
 * Map API error codes/status to user-safe copy.
 * Never surfaces env var names, stack traces, or ops instructions.
 * Complexity: O(1).
 */

/** Public message when GenAI is unavailable (misconfig or provider outage). */
export const AI_UNAVAILABLE_MESSAGE =
  "AI is temporarily unavailable. Try again shortly.";

/** Public message for rate limits / cooldowns. */
export const RATE_LIMITED_MESSAGE =
  "Too many requests. Wait a few seconds, then retry.";

/** Public message when the session token is gone or expired. */
export const SESSION_EXPIRED_MESSAGE =
  "Session expired. Please upload again.";

/** Public message for unexpected server failures. */
export const INTERNAL_ERROR_MESSAGE =
  "Something went wrong. Please try again.";

/**
 * Codes that must never leak their raw server message to the UI
 * (may contain ops hints like env var names).
 */
const FORCE_MAPPED = new Set([
  "AI_NOT_CONFIGURED",
  "RATE_LIMITED",
  "NOT_FOUND",
  "INTERNAL",
]);

/**
 * Resolve a calm, user-facing error string from an API error body.
 *
 * @param code - Machine code from `{ error: { code } }` (optional)
 * @param status - HTTP status
 * @param serverMessage - Optional server message (used only when safe)
 * @param fallback - Last-resort copy when nothing else matches
 */
export function mapApiError(
  code: string | undefined,
  status: number,
  serverMessage?: string,
  fallback = INTERNAL_ERROR_MESSAGE,
): string {
  if (code === "AI_NOT_CONFIGURED" || status === 503) {
    return AI_UNAVAILABLE_MESSAGE;
  }
  if (code === "RATE_LIMITED" || status === 429) {
    return RATE_LIMITED_MESSAGE;
  }
  if (code === "NOT_FOUND" || status === 404) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (code === "INTERNAL" || status >= 500) {
    return INTERNAL_ERROR_MESSAGE;
  }

  if (
    serverMessage &&
    !FORCE_MAPPED.has(code ?? "") &&
    !/GROQ_API_KEY|process\.env|stack/i.test(serverMessage)
  ) {
    return serverMessage;
  }

  return fallback;
}

/**
 * Parse a failed fetch response body into user-safe copy.
 * Complexity: O(1) aside from JSON parse.
 */
export function mapApiErrorFromBody(
  status: number,
  body: unknown,
  fallback?: string,
): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    body.error &&
    typeof body.error === "object" &&
    "code" in body.error
  ) {
    const err = body.error as { code?: unknown; message?: unknown };
    const code = typeof err.code === "string" ? err.code : undefined;
    const message = typeof err.message === "string" ? err.message : undefined;
    return mapApiError(code, status, message, fallback);
  }
  return mapApiError(undefined, status, undefined, fallback);
}
