/**
 * Deterministic citation validation for Chat answers.
 * Complexity: O(c) in citation count.
 */

import type { ChatCitation } from "@/types/session";

export type ValidateCitationsInput = {
  /** Model answer text. */
  answer: string;
  /** Citations the model claimed. */
  citations: ChatCitation[];
  /** Corpus chunk ids retrieved this turn. */
  retrievedIds: Set<string>;
  /** Lease clause ids on the session, e.g. c-1. */
  leaseClauseIds: Set<string>;
};

export type ValidateCitationsResult =
  | { ok: true; citations: ChatCitation[] }
  | { ok: false; reason: "empty_answer" | "forged_id" | "missing_statute_citation" };

const STATUTE_CLAIM =
  /\b(act|section|statute|rera|rent control|tenancy|landlord|tenant|deposit|evict|sub-?let)\b/i;

/**
 * Normalize a lease citation id to `lease:c-N` form.
 */
export function normalizeCitationId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith("lease:")) {
    return trimmed;
  }
  if (/^c-\d+$/i.test(trimmed)) {
    return `lease:${trimmed.toLowerCase()}`;
  }
  return trimmed;
}

/**
 * Validate citations against retrieved corpus ids + session lease clause ids.
 *
 * Rules:
 * - Non-empty answer required.
 * - Every citation id must be in retrievedIds OR a lease:c-N for a real clause.
 * - If the answer looks like it makes a statute/lease-law claim, at least one
 *   citation is required (statute or lease).
 */
export function validateCitations(
  input: ValidateCitationsInput,
): ValidateCitationsResult {
  const answer = input.answer.trim();
  if (!answer) {
    return { ok: false, reason: "empty_answer" };
  }

  const normalized: ChatCitation[] = [];
  for (const c of input.citations) {
    const id = normalizeCitationId(c.id);
    if (id.startsWith("lease:")) {
      const clauseId = id.slice("lease:".length);
      if (!input.leaseClauseIds.has(clauseId)) {
        return { ok: false, reason: "forged_id" };
      }
      normalized.push({
        id,
        label: c.label?.trim() || `Your lease · Clause ${clauseId.replace(/^c-/, "")}`,
        sourceUrl: undefined,
      });
      continue;
    }
    if (!input.retrievedIds.has(id)) {
      return { ok: false, reason: "forged_id" };
    }
    normalized.push({
      id,
      label: c.label?.trim() || id,
      sourceUrl: c.sourceUrl,
    });
  }

  if (STATUTE_CLAIM.test(answer) && normalized.length === 0) {
    return { ok: false, reason: "missing_statute_citation" };
  }

  return { ok: true, citations: normalized };
}
