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
