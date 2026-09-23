/**
 * rera_grievance_check — lookup table dispute type → RERA applicable?
 * Always called from Options so "not applicable" is explicit.
 *
 * Complexity: O(1) per dispute type after table load.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_RERA_DISPUTE_TYPES } from "@/lib/constants";
import type { ReraCheckResult } from "@/types/session";

type ReraTableEntry = {
  applicable: boolean;
  explanation: string;
  citeChunkId?: string;
};

type ReraTable = Record<string, ReraTableEntry>;

/** Allowlisted dispute types — never accept free-form client strings as keys. */
export const RERA_DISPUTE_TYPES = [
  "residential_rent_dispute",
  "deposit_refund",
  "eviction_threat",
  "essential_services",
  "promoter_allottee",
  "builder_delay",
] as const;

export type ReraDisputeType = (typeof RERA_DISPUTE_TYPES)[number];

const ALLOWED = new Set<string>(RERA_DISPUTE_TYPES);

let table: ReraTable | null = null;

function loadTable(): ReraTable {
  if (table) return table;
  const path = join(process.cwd(), "data/corpus/rera-grievance-table.json");
  table = JSON.parse(readFileSync(path, "utf8")) as ReraTable;
  return table;
}

/**
 * Lookup one dispute type. Unknown / non-allowlisted types return not applicable
 * with a generic explanation (never invent applicability).
 */
export function reraGrievanceCheck(disputeType: string): ReraCheckResult {
  const key = disputeType.trim();
  if (!ALLOWED.has(key)) {
    return {
      disputeType: key || "unknown",
      applicable: false,
      explanation:
        "Unknown dispute type — RERA applicability was not evaluated for this label.",
    };
  }
  const entry = loadTable()[key];
  if (!entry) {
    return {
      disputeType: key,
      applicable: false,
      explanation:
        "No RERA guidance for this dispute type in the pilot table.",
    };
  }
  return {
    disputeType: key,
    applicable: entry.applicable,
    explanation: entry.explanation,
    citeChunkId: entry.citeChunkId,
  };
}

/**
 * Map conflict rule ids to RERA dispute types to evaluate.
 * Always includes residential_rent_dispute so non-applicability is explicit.
 */
export function disputeTypesFromFlags(ruleIds: string[]): ReraDisputeType[] {
  const selected = new Set<ReraDisputeType>(["residential_rent_dispute"]);

  for (const ruleId of ruleIds) {
    if (ruleId === "deposit_high_vs_rent" || ruleId === "missing_deposit_refund") {
      selected.add("deposit_refund");
    }
    if (ruleId === "missing_essential_services") {
      selected.add("essential_services");
    }
    if (ruleId === "missing_notice" || ruleId === "missing_sublet") {
      selected.add("eviction_threat");
    }
  }

  return [...selected].slice(0, MAX_RERA_DISPUTE_TYPES);
}

/**
 * Run rera_grievance_check for each allowlisted dispute type in `types`.
 * Complexity: O(T) for T ≤ MAX_RERA_DISPUTE_TYPES.
 */
export function reraGrievanceCheckMany(
  types: readonly string[],
): ReraCheckResult[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const t of types) {
    if (!ALLOWED.has(t) || seen.has(t)) continue;
    seen.add(t);
    unique.push(t);
    if (unique.length >= MAX_RERA_DISPUTE_TYPES) break;
  }
  if (unique.length === 0) {
    unique.push("residential_rent_dispute");
  }
  return unique.map((t) => reraGrievanceCheck(t));
}

/** Tests — clear cached table. */
export function clearReraTableCache(): void {
  table = null;
}
