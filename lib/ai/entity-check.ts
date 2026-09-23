/**
 * Deterministic entity check for Simplify paraphrases.
 * Ensures the model did not invent numbers or names absent from the original.
 *
 * Complexity: O(n) in the combined length of original + paraphrase.
 */

/** Result of comparing paraphrase entities against the original clause. */
export type EntityCheckResult = {
  /** True when no invented numbers or names were found. */
  ok: boolean;
  /**
   * Invented tokens found in the paraphrase.
   * Callers must not log these strings — only `invented.length`.
   */
  invented: string[];
};

/** Common English / legal stopwords that should not count as "names". */
const NAME_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "by",
  "with",
  "from",
  "as",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "he",
  "she",
  "his",
  "her",
  "who",
  "which",
  "what",
  "when",
  "where",
  "how",
  "if",
  "then",
  "than",
  "but",
  "not",
  "no",
  "nor",
  "so",
  "such",
  "may",
  "shall",
  "will",
  "can",
  "must",
  "should",
  "would",
  "could",
  "might",
  "hereby",
  "herein",
  "thereof",
  "therein",
  "whereas",
  "landlord",
  "tenant",
  "party",
  "parties",
  "agreement",
  "lease",
  "premises",
  "property",
  "deposit",
  "security",
  "rent",
  "notice",
  "month",
  "months",
  "year",
  "years",
  "day",
  "days",
  "date",
  "written",
  "prior",
  "after",
  "before",
  "within",
  "upon",
  "under",
  "above",
  "below",
  "between",
  "during",
  "each",
  "every",
  "all",
  "any",
  "other",
  "only",
  "also",
  "either",
  "both",
  "pay",
  "paid",
  "payable",
  "payment",
  "amount",
  "rupees",
  "inr",
  "rs",
  "percent",
  "percentage",
  "clause",
  "section",
  "article",
  "term",
  "terms",
  "condition",
  "conditions",
  "residential",
  "flat",
  "apartment",
  "building",
  "maintenance",
  "repair",
  "repairs",
  "minor",
  "major",
  "structural",
  "responsible",
  "handles",
  "handle",
  "keep",
  "good",
  "condition",
  "report",
  "promptly",
  "commencing",
  "expires",
  "expire",
  "renewed",
  "renew",
  "unless",
  "subject",
  "herein",
  "signing",
  "time",
  "calendar",
  "monthly",
  "solely",
  "purposes",
  "purpose",
  "used",
  "use",
  "located",
  "location",
  "made",
  "agree",
  "agrees",
  "agreed",
  "plain",
  "language",
  "apr",
  "mar",
  "jan",
  "feb",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
  "april",
  "march",
  "january",
  "february",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

/**
 * Normalize a numeric token for set comparison.
 * Strips currency symbols, commas, and whitespace; lowercases.
 * Complexity: O(k) in token length.
 */
function normalizeNumber(raw: string): string {
  return raw
    .replace(/[₹$€£,\s]/g, "")
    .replace(/%/g, "%")
    .toLowerCase();
}

/**
 * Extract numeric tokens: Indian-style amounts, percentages, bare integers,
 * and simple date-like digit groups.
 * Complexity: O(n) in text length.
 */
export function extractNumbers(text: string): Set<string> {
  const found = new Set<string>();
  // Indian / Western amounts with optional currency and %; dates like 1 Apr 2026 handled via digits
  // Dates before bare digits so "01/04/2026" is not split into "01"
  const re =
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:₹|Rs\.?\s*|INR\s*)?\d{1,3}(?:,\d{2,3})+(?:\.\d+)?%?|\d+(?:\.\d+)?%?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const normalized = normalizeNumber(match[0]);
    if (normalized.length > 0 && normalized !== "%") {
      found.add(normalized);
    }
  }
  return found;
}

/**
 * Extract capitalized / proper-name-like tokens, excluding stopwords.
 * Also captures ALLCAPS acronyms of length >= 2.
 * Complexity: O(n) in text length.
 */
export function extractNames(text: string): Set<string> {
  const found = new Set<string>();
  // Multi-word Title Case sequences and single Capitalized words / ACRONYMS
  const re = /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|[A-Z]{2,}|\b[A-Z][a-z]{2,})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0].trim();
    const parts = raw.split(/\s+/);
    // Multi-word names: keep the whole phrase lowercased
    if (parts.length > 1) {
      found.add(raw.toLowerCase());
      continue;
    }
    const lower = raw.toLowerCase();
    if (NAME_STOPWORDS.has(lower)) {
      continue;
    }
    // Skip lone month abbreviations already in stopwords; skip very short
    if (lower.length < 3 && raw !== raw.toUpperCase()) {
      continue;
    }
    found.add(lower);
  }
  return found;
}

/**
 * Check that a paraphrase does not invent numbers or names absent from the original.
 *
 * Omissions are allowed (paraphrase may drop secondary detail).
 * Inventions are not (any number/name in paraphrase must appear in original).
 *
 * Complexity: O(n) where n is |original| + |paraphrase|.
 */
export function entityCheck(
  original: string,
  paraphrase: string,
): EntityCheckResult {
  const origNumbers = extractNumbers(original);
  const paraNumbers = extractNumbers(paraphrase);
  const origNames = extractNames(original);
  const paraNames = extractNames(paraphrase);

  const invented: string[] = [];

  for (const num of paraNumbers) {
    if (!origNumbers.has(num)) {
      invented.push(num);
    }
  }

  for (const name of paraNames) {
    if (!origNames.has(name)) {
      // Allow paraphrase-only filler words that slipped capitalization
      if (NAME_STOPWORDS.has(name)) {
        continue;
      }
      invented.push(name);
    }
  }

  return { ok: invented.length === 0, invented };
}
