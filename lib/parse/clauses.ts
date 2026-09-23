import { MAX_CLAUSES } from "@/lib/constants";
import type { Clause } from "@/types/session";

const NUMBERED_CLAUSE =
  /(?:^|\n)\s*(?:(?:Clause|CLAUSE|Article|ARTICLE)\s+)?(\d{1,3})[.)]\s+/g;

/**
 * Parse lease text into clauses.
 * Prefers numbered clause markers; falls back to blank-line paragraphs.
 * Complexity: O(n) in text length; output capped at MAX_CLAUSES.
 */
export function parseClauses(text: string): Clause[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const numbered = splitNumbered(normalized);
  const segments =
    numbered.length >= 2 ? numbered : splitParagraphs(normalized);

  const usable = segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && !isPlaceholderClause(segment));

  const capped = usable.slice(0, MAX_CLAUSES);
  return capped.map((trimmed, i) => {
    const heading = detectHeading(trimmed);
    return {
      id: `c-${i + 1}`,
      index: i + 1,
      ...(heading ? { heading } : {}),
      text: trimmed,
    };
  });
}

/** Witness / signature lines that are only underscores. */
function isPlaceholderClause(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return compact.length > 0 && /^_+$/.test(compact);
}

/**
 * Split on numbered clause markers while preserving body text.
 * Complexity: O(n).
 */
function splitNumbered(text: string): string[] {
  const matches = [...text.matchAll(NUMBERED_CLAUSE)];
  if (matches.length < 2) {
    return [];
  }

  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const start = (match.index ?? 0) + match[0].length;
    const end =
      i + 1 < matches.length ? (matches[i + 1]!.index ?? text.length) : text.length;
    const body = text.slice(start, end).trim();
    if (body) {
      parts.push(body);
    }
  }
  return parts;
}

/** Fallback: non-empty paragraphs separated by blank lines. O(n). */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Treat a short first line ending with a colon (or title-ish) as a heading.
 */
function detectHeading(text: string): string | undefined {
  const firstLine = text.split("\n")[0]?.trim();
  if (!firstLine) {
    return undefined;
  }
  if (firstLine.length <= 80 && /:\s*$/.test(firstLine)) {
    return firstLine.replace(/:\s*$/, "");
  }
  return undefined;
}
