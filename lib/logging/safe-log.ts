/**
 * Metadata-only logger. Never log document content, clause text, or chat.
 * Complexity: O(1) per call.
 */

export type SafeLogFields = {
  activity: string;
  ok: boolean;
  latencyMs?: number;
  bytes?: number;
  mime?: string;
  code?: string;
  clauseCount?: number;
  /** Extension only — never the original filename (may contain PII). */
  ext?: string;
  /** Entity-check passed for Simplify (metadata only). */
  validated?: boolean;
  /** Simplify served from session cache. */
  cached?: boolean;
  /** Prompt token count from the provider (no content). */
  promptTokens?: number;
  /** Completion token count from the provider (no content). */
  completionTokens?: number;
  /** Count of invented entities detected — never the entity strings. */
  inventedCount?: number;
};

/**
 * Emit a structured JSON log line with allowlisted metadata fields only.
 */
export function safeLog(fields: SafeLogFields): void {
  const payload = {
    ts: new Date().toISOString(),
    ...fields,
  };
  console.log(JSON.stringify(payload));
}
