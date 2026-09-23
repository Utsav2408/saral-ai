/**
 * state_law_status — hardcoded regime lookup for pilot states.
 * Complexity: O(1).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CorpusState } from "@/lib/corpus/types";
import type { ChatRegimeDto } from "@/types/session";

export type LawCategory = "residential_rent" | "rera_project";

export type RegimeResult = {
  state: string;
  category: LawCategory;
  code: string;
  label: string;
  stateCode: CorpusState | "UNKNOWN";
  known: boolean;
};

type RegimeEntry = {
  code: string;
  label: string;
  stateCode: string;
};

type StatusTable = Record<string, Partial<Record<LawCategory, RegimeEntry>>>;

let table: StatusTable | null = null;

function loadTable(): StatusTable {
  if (table) return table;
  const path = join(process.cwd(), "data/corpus/state-law-status.json");
  table = JSON.parse(readFileSync(path, "utf8")) as StatusTable;
  return table;
}

/** Normalize free-text state names from fact extraction. */
export function normalizeStateName(state: string | undefined): string | undefined {
  if (!state) return undefined;
  const s = state.trim().toLowerCase();
  if (s === "mh" || s.includes("maharashtra") || s === "mumbai") {
    return "Maharashtra";
  }
  if (
    s === "up" ||
    s.includes("uttar pradesh") ||
    s.includes("uttar-pradesh") ||
    s === "lucknow" ||
    s === "noida"
  ) {
    return "Uttar Pradesh";
  }
  return state.trim();
}

/**
 * Lookup legal regime for a state + category.
 * Unknown combinations return known:false with code "unknown" — never invent.
 */
export function stateLawStatus(
  state: string | undefined,
  category: LawCategory = "residential_rent",
): RegimeResult {
  const normalized = normalizeStateName(state) ?? "Unknown";
  const entry = loadTable()[normalized]?.[category];
  if (!entry) {
    return {
      state: normalized,
      category,
      code: "unknown",
      label: "Unknown regime — no statute grounding for this state/category",
      stateCode: "UNKNOWN",
      known: false,
    };
  }
  return {
    state: normalized,
    category,
    code: entry.code,
    label: entry.label,
    stateCode: entry.stateCode as CorpusState,
    known: true,
  };
}

/** Public DTO for chat / options API responses (drops internal stateCode). */
export function toRegimeDto(regime: RegimeResult): ChatRegimeDto {
  return {
    state: regime.state,
    category: regime.category,
    code: regime.code,
    label: regime.label,
  };
}

/** Tests — clear cached table. */
export function clearStateLawCache(): void {
  table = null;
}
