import { describe, expect, it } from "vitest";
import {
  ESCALATION_KEYWORDS,
  escalationGuard,
} from "@/lib/tools/escalation-guard";
import type { Clause } from "@/types/session";

function clause(text: string): Clause {
  return { id: "c-1", index: 1, text };
}

describe("escalationGuard", () => {
  it("does not trigger on ordinary lease language", () => {
    const result = escalationGuard([
      clause(
        "The Tenant shall pay rent and keep the premises in good condition. Notice of one month applies.",
      ),
    ]);
    expect(result.triggered).toBe(false);
    expect(result.matchedTermCount).toBe(0);
  });

  it("triggers on FIR / police complaint", () => {
    const result = escalationGuard([
      clause(
        "Party A filed an FIR and a police complaint regarding the premises.",
      ),
    ]);
    expect(result.triggered).toBe(true);
    expect(result.matchedTermCount).toBeGreaterThanOrEqual(2);
  });

  it("triggers on court order", () => {
    const result = escalationGuard([
      clause("Possession is subject to an existing court order dated 2024."),
    ]);
    expect(result.triggered).toBe(true);
  });

  it("uses word boundaries — fir does not match fire", () => {
    const result = escalationGuard([
      clause("Tenant must not start a fire in the kitchen."),
    ]);
    expect(result.triggered).toBe(false);
  });

  it("does not match courtyard as court order", () => {
    const result = escalationGuard([
      clause("Common courtyard access is shared with other tenants."),
    ]);
    expect(result.triggered).toBe(false);
  });

  it("keyword list is bounded and non-empty", () => {
    expect(ESCALATION_KEYWORDS.length).toBeGreaterThan(5);
    expect(ESCALATION_KEYWORDS.length).toBeLessThan(50);
  });
});
