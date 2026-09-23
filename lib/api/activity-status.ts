/**
 * Map GenAI activity failure codes to HTTP status.
 * Complexity: O(1).
 */

/** Codes that indicate bad client input (not provider failure). */
const CLIENT_INPUT_CODES = new Set([
  "EMPTY_MESSAGE",
  "MESSAGE_TOO_LONG",
]);

/** Codes that indicate validation / unprocessable session content. */
export const VALIDATION_CODES = new Set([
  "ENTITY_CHECK_FAILED",
  "ID_MISMATCH",
  "NO_CLAUSES",
  "TOO_MANY_CLAUSES",
  "VALIDATION_FAILED",
  "NO_RETRIEVAL",
]);

/**
 * Resolve HTTP status for an activity error code.
 * Defaults: AI_NOT_CONFIGURED→503, RATE_LIMITED→429, validation→422, else→502.
 */
export function httpStatusForActivityCode(
  code: string,
  extras?: {
    clientInput?: ReadonlySet<string>;
    validation?: ReadonlySet<string>;
  },
): number {
  if (code === "AI_NOT_CONFIGURED") return 503;
  if (code === "RATE_LIMITED") return 429;

  const client = extras?.clientInput ?? CLIENT_INPUT_CODES;
  if (client.has(code)) return 400;

  const validation = extras?.validation ?? VALIDATION_CODES;
  if (validation.has(code)) return 422;

  return 502;
}
