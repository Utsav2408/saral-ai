import type { ExtractedFacts } from "@/types/session";

const INDIAN_STATES = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Uttar Pradesh",
  "Gujarat",
  "Rajasthan",
  "West Bengal",
  "Telangana",
  "Kerala",
  "Punjab",
  "Haryana",
  "Madhya Pradesh",
  "Andhra Pradesh",
  "Bihar",
  "Odisha",
  "Assam",
  "Jharkhand",
  "Chhattisgarh",
  "Goa",
] as const;

const MONTHS =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

const DATE_PATTERN = new RegExp(
  `\\b(\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b`,
  "i",
);

/**
 * Regex-based fact extraction from lease text.
 * Never throws on no-match; returns nullable fields.
 * Complexity: O(n) over the input string (fixed number of regex passes).
 */
export function extractFacts(text: string): ExtractedFacts {
  const facts: ExtractedFacts = {};

  const deposit = extractDeposit(text);
  if (deposit) {
    facts.depositAmount = deposit.amount;
    facts.depositCurrency = deposit.currency;
  }

  const start = extractDatedField(text, [
    /(?:lease\s+start|commencing(?:\s+from)?|commencement|w\.?e\.?f\.?|from\s+(?:the\s+)?(?:date|day)|starting\s+(?:on|from)|effective\s+(?:from|date))\s*[:\-]?\s*/i,
  ]);
  if (start) {
    facts.leaseStart = start;
  }

  const end = extractDatedField(text, [
    /(?:lease\s+end|expir(?:y|es|ing)|terminat(?:es|ion)|until|upto|up\s+to|ending\s+(?:on|by))\s*[:\-]?\s*/i,
  ]);
  if (end) {
    facts.leaseEnd = end;
  }

  const notice = extractNotice(text);
  if (notice) {
    facts.noticePeriod = notice;
  }

  const state = extractState(text);
  if (state) {
    facts.state = state;
  }

  if (/\b(residential|1bhk|2bhk|3bhk|flat|apartment)\b/i.test(text)) {
    facts.propertyType = "Residential lease";
  }

  return facts;
}

function extractDeposit(
  text: string,
): { amount: number; currency: string } | undefined {
  const patterns = [
    /(?:security\s+deposit|deposit|earnest\s+money)\s*(?:of|amount|:)?\s*(?:is\s*)?(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:as\s+)?(?:security\s+)?deposit/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = Number.parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, currency: "INR" };
      }
    }
  }
  return undefined;
}

function extractDatedField(text: string, prefixes: RegExp[]): string | undefined {
  for (const prefix of prefixes) {
    const combined = new RegExp(
      `${prefix.source}(?:(?:on|from|the|dated)\\s+)?${DATE_PATTERN.source}`,
      "i",
    );
    const match = text.match(combined);
    // DATE_PATTERN is the last capturing group in the combined expression.
    const date = match?.[match.length - 1];
    if (date) {
      return normalizeDate(date);
    }
  }
  return undefined;
}

function extractNotice(text: string): string | undefined {
  const match = text.match(
    /(\d+)\s*(days?|months?)\s*(?:['’]?\s*)?(?:prior\s+)?notice/i,
  );
  if (!match) {
    const alt = text.match(
      /notice\s*(?:period)?\s*(?:of|:)?\s*(\d+)\s*(days?|months?)/i,
    );
    if (!alt) {
      return undefined;
    }
    return `${alt[1]} ${normalizeUnit(alt[2]!)}`;
  }
  return `${match[1]} ${normalizeUnit(match[2]!)}`;
}

function extractState(text: string): string | undefined {
  for (const state of INDIAN_STATES) {
    if (new RegExp(`\\b${state}\\b`, "i").test(text)) {
      return state;
    }
  }
  return undefined;
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase();
  if (lower.startsWith("month")) {
    return lower.endsWith("s") ? "months" : "month";
  }
  return lower.endsWith("s") ? "days" : "day";
}

function normalizeDate(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}
