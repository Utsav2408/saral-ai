/**
 * Escalation Guard — keyword MVP for criminal-adjacent / active-litigation terms.
 * Deliberately simple and conservative (prefer false positive over silent DIY advice).
 *
 * Complexity: O(T · K · L) for T texts, K fixed keywords, L scanned chars per text.
 * Never log matched term strings — only matchedTermCount.
 */

import { MAX_ESCALATION_SCAN_CHARS } from "@/lib/constants";
import type { Clause } from "@/types/session";

/**
 * Bounded allowlist — no user-supplied patterns.
 * Multi-word phrases are matched as whole phrases (case-insensitive).
 */
export const ESCALATION_KEYWORDS: readonly string[] = [
  "assault",
  "fir",
  "police complaint",
  "police case",
  "criminal intimidation",
  "criminal force",
  "ongoing suit",
  "pending suit",
  "court order",
  "stay order",
  "injunction",
  "forged",
  "forgery",
  "ipc",
  "criminal complaint",
  "arrest",
  "cognizable",
  "bail",
  "litigation pending",
  "active litigation",
  "writ petition",
  "filed a case",
  "file a case",
  "rent court",
] as const;

export type EscalationGuardResult = {
  triggered: boolean;
  /** Count only — never expose matched strings to logs. */
  matchedTermCount: number;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a word-boundary pattern for a keyword/phrase.
 * "fir" must not match "fire"; "court order" matches as a phrase.
 */
function keywordPattern(keyword: string): RegExp {
  const parts = keyword.trim().split(/\s+/).map(escapeRegex);
  const body = parts.join("\\s+");
  return new RegExp(`\\b${body}\\b`, "i");
}

const COMPILED = ESCALATION_KEYWORDS.map((k) => ({
  key: k,
  pattern: keywordPattern(k),
}));

/**
 * Scan a single text blob for escalation keywords (bounded length).
 */
export function scanEscalationText(raw: string): EscalationGuardResult {
  return escalationGuardFromTexts([raw]);
}

/**
 * Scan one or more text blobs; counts unique keyword hits across all texts.
 */
export function escalationGuardFromTexts(
  texts: readonly string[],
): EscalationGuardResult {
  let matchedTermCount = 0;
  const hitKeys = new Set<string>();

  for (const raw of texts) {
    const text =
      raw.length > MAX_ESCALATION_SCAN_CHARS
        ? raw.slice(0, MAX_ESCALATION_SCAN_CHARS)
        : raw;
    for (const { key, pattern } of COMPILED) {
      if (hitKeys.has(key)) continue;
      if (pattern.test(text)) {
        hitKeys.add(key);
        matchedTermCount += 1;
      }
    }
  }

  return {
    triggered: matchedTermCount > 0,
    matchedTermCount,
  };
}

/**
 * Scan clause text for escalation keywords.
 */
export function escalationGuard(clauses: Clause[]): EscalationGuardResult {
  return escalationGuardFromTexts(clauses.map((c) => c.text));
}
