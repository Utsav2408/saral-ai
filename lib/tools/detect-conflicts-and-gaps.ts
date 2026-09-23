/**
 * detect_conflicts_and_gaps — deterministic rule checks (not LLM).
 *
 * Rules (rationale):
 * - deposit_high_vs_rent: UP/Model Tenancy caps residential deposit at 2× rent;
 *   Maharashtra has no hard statute cap in the pilot corpus, so we flag >6× as
 *   “high vs typical market practice.”
 * - missing_notice: fair-market leases state notice; facts.noticePeriod or keywords.
 * - missing_receipt: MRCA s.31-style receipt obligation — gap if never mentioned.
 * - missing_essential_services: Model/UP-style protection — gap if never mentioned.
 * - missing_sublet: sub-let / assignment consent commonly expected.
 * - missing_deposit_refund: deposit present but no refund language.
 *
 * Complexity: O(R · C · L) for R rules, C clauses, L avg clause length
 * (R and keyword sets are fixed and small).
 */

import {
  DEPOSIT_MONTHS_CAP_UP_MODEL,
  DEPOSIT_MONTHS_TYPICAL_MH,
  MAX_CONFLICT_FLAGS,
} from "@/lib/constants";
import { normalizeStateName } from "@/lib/tools/state-law-status";
import type { Clause, ConflictFlag, ExtractedFacts } from "@/types/session";

export type DetectConflictsInput = {
  facts: ExtractedFacts;
  clauses: Clause[];
};

type KeywordRule = {
  ruleId: string;
  severity: ConflictFlag["severity"];
  summaryKey: string;
  /** If any keyword matches any clause, the gap is NOT flagged. */
  keywords: RegExp[];
  /** Extra gate — return true to skip this rule entirely. */
  skipIf?: (facts: ExtractedFacts) => boolean;
};

const GAP_RULES: KeywordRule[] = [
  {
    ruleId: "missing_notice",
    severity: "warning",
    summaryKey: "gap.missing_notice",
    keywords: [
      /\bnotice\b/i,
      /\bterminat/i,
      /\bprior\s+notice\b/i,
    ],
    skipIf: (facts) => Boolean(facts.noticePeriod),
  },
  {
    ruleId: "missing_receipt",
    severity: "info",
    summaryKey: "gap.missing_receipt",
    keywords: [/\breceipt\b/i, /\backnowledg(?:e|ement)\b/i],
  },
  {
    ruleId: "missing_essential_services",
    severity: "info",
    summaryKey: "gap.missing_essential_services",
    keywords: [
      /\bessential\s+(?:supply|supplies|service)/i,
      /\butilities?\b/i,
      /\bwater\s+(?:and|&)\s+electricity\b/i,
      /\bwithhold\b/i,
    ],
  },
  {
    ruleId: "missing_sublet",
    severity: "info",
    summaryKey: "gap.missing_sublet",
    keywords: [
      /\bsub-?\s*let/i,
      /\bsublet/i,
      /\bassign(?:ment|ing)?\b/i,
      /\bpart(?:ing)?\s+with\s+possession\b/i,
    ],
  },
  {
    ruleId: "missing_deposit_refund",
    severity: "warning",
    summaryKey: "gap.missing_deposit_refund",
    keywords: [
      /\brefund\b/i,
      /\breturn(?:ed|ing)?\s+(?:of\s+)?(?:the\s+)?(?:security\s+)?deposit\b/i,
      /\bdeposit\s+(?:shall\s+be\s+)?(?:returned|refunded)\b/i,
    ],
    skipIf: (facts) => facts.depositAmount == null,
  },
];

const RENT_PATTERNS = [
  /(?:monthly\s+)?rent\s+(?:of|amount|:)?\s*(?:is\s*)?(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:per\s+month|\/\s*month|monthly)\b/i,
  /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:as\s+)?(?:monthly\s+)?rent\b/i,
];

/**
 * Extract monthly rent from clause text when facts do not carry it.
 * Complexity: O(C · L).
 */
export function extractMonthlyRent(clauses: Clause[]): number | undefined {
  for (const clause of clauses) {
    for (const pattern of RENT_PATTERNS) {
      const match = clause.text.match(pattern);
      if (match?.[1]) {
        const amount = Number.parseFloat(match[1].replace(/,/g, ""));
        if (Number.isFinite(amount) && amount > 0) {
          return amount;
        }
      }
    }
  }
  return undefined;
}

function clausesMatching(
  clauses: Clause[],
  patterns: RegExp[],
): string[] {
  const ids: string[] = [];
  for (const clause of clauses) {
    for (const pattern of patterns) {
      if (pattern.test(clause.text)) {
        ids.push(clause.id);
        break;
      }
    }
  }
  return ids;
}

function anyKeywordMatch(clauses: Clause[], patterns: RegExp[]): boolean {
  return clausesMatching(clauses, patterns).length > 0;
}

function depositThresholdMonths(state: string | undefined): number {
  const normalized = normalizeStateName(state);
  if (normalized === "Uttar Pradesh") {
    return DEPOSIT_MONTHS_CAP_UP_MODEL;
  }
  return DEPOSIT_MONTHS_TYPICAL_MH;
}

function checkDepositHigh(
  facts: ExtractedFacts,
  clauses: Clause[],
): ConflictFlag | null {
  const deposit = facts.depositAmount;
  if (deposit == null || deposit <= 0) {
    return null;
  }
  const rent = extractMonthlyRent(clauses);
  if (rent == null || rent <= 0) {
    return null;
  }
  const months = deposit / rent;
  const threshold = depositThresholdMonths(facts.state);
  if (months <= threshold) {
    return null;
  }
  const depositClauses = clausesMatching(clauses, [
    /\bdeposit\b/i,
    /\bsecurity\s+deposit\b/i,
  ]);
  return {
    id: "flag-deposit_high_vs_rent",
    ruleId: "deposit_high_vs_rent",
    severity: "critical",
    summaryKey: "conflict.deposit_high_vs_rent",
    clauseIds: depositClauses.length > 0 ? depositClauses : undefined,
    factRefs: ["depositAmount"],
  };
}

/**
 * Run all conflict / gap rules. Returns at most MAX_CONFLICT_FLAGS flags.
 */
export function detectConflictsAndGaps(
  input: DetectConflictsInput,
): ConflictFlag[] {
  const { facts, clauses } = input;
  const flags: ConflictFlag[] = [];

  const depositFlag = checkDepositHigh(facts, clauses);
  if (depositFlag) {
    flags.push(depositFlag);
  }

  for (const rule of GAP_RULES) {
    if (flags.length >= MAX_CONFLICT_FLAGS) {
      break;
    }
    if (rule.skipIf?.(facts)) {
      continue;
    }
    if (anyKeywordMatch(clauses, rule.keywords)) {
      continue;
    }
    flags.push({
      id: `flag-${rule.ruleId}`,
      ruleId: rule.ruleId,
      severity: rule.severity,
      summaryKey: rule.summaryKey,
      factRefs:
        rule.ruleId === "missing_deposit_refund" && facts.depositAmount != null
          ? ["depositAmount"]
          : undefined,
    });
  }

  return flags.slice(0, MAX_CONFLICT_FLAGS);
}
