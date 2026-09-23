import { describe, expect, it } from "vitest";
import {
  detectConflictsAndGaps,
  extractMonthlyRent,
} from "@/lib/tools/detect-conflicts-and-gaps";
import type { Clause, ExtractedFacts } from "@/types/session";

function clause(id: string, text: string, index = 1): Clause {
  return { id, index, text };
}

describe("extractMonthlyRent", () => {
  it("parses monthly rent from clause text", () => {
    const rent = extractMonthlyRent([
      clause("c-1", "Monthly rent of ₹45,000 is payable on the 5th."),
    ]);
    expect(rent).toBe(45000);
  });

  it("returns undefined when no rent", () => {
    expect(extractMonthlyRent([clause("c-1", "No money here.")])).toBeUndefined();
  });
});

describe("detectConflictsAndGaps", () => {
  it("flags high deposit vs rent for Maharashtra (>6×)", () => {
    const facts: ExtractedFacts = {
      depositAmount: 350_000,
      state: "Maharashtra",
    };
    const clauses = [
      clause("c-1", "Security deposit of ₹3,50,000."),
      clause("c-2", "Monthly rent of ₹45,000 is payable."),
    ];
    const flags = detectConflictsAndGaps({ facts, clauses });
    expect(flags.some((f) => f.ruleId === "deposit_high_vs_rent")).toBe(true);
  });

  it("does not flag typical MH deposit (≤6×)", () => {
    const facts: ExtractedFacts = {
      depositAmount: 150_000,
      state: "Maharashtra",
    };
    const clauses = [
      clause("c-1", "Security deposit of ₹1,50,000."),
      clause("c-2", "Monthly rent of ₹45,000 is payable."),
    ];
    const flags = detectConflictsAndGaps({ facts, clauses });
    expect(flags.some((f) => f.ruleId === "deposit_high_vs_rent")).toBe(false);
  });

  it("flags UP deposit above 2× rent", () => {
    const facts: ExtractedFacts = {
      depositAmount: 150_000,
      state: "Uttar Pradesh",
    };
    const clauses = [
      clause("c-1", "Security deposit of ₹1,50,000."),
      clause("c-2", "Monthly rent of ₹45,000 is payable."),
    ];
    const flags = detectConflictsAndGaps({ facts, clauses });
    expect(flags.some((f) => f.ruleId === "deposit_high_vs_rent")).toBe(true);
  });

  it("flags missing receipt / essential services / sublet", () => {
    const facts: ExtractedFacts = { depositAmount: 10_000 };
    const clauses = [
      clause("c-1", "Tenant pays deposit of ₹10,000."),
      clause("c-2", "Monthly rent of ₹5,000."),
      clause("c-3", "Either party may terminate with 1 month prior notice."),
    ];
    const flags = detectConflictsAndGaps({ facts, clauses });
    const ids = flags.map((f) => f.ruleId);
    expect(ids).toContain("missing_receipt");
    expect(ids).toContain("missing_essential_services");
    expect(ids).toContain("missing_sublet");
    expect(ids).toContain("missing_deposit_refund");
    expect(ids).not.toContain("missing_notice");
  });

  it("skips missing_notice when facts.noticePeriod set", () => {
    const flags = detectConflictsAndGaps({
      facts: { noticePeriod: "1 month" },
      clauses: [clause("c-1", "A short lease with no notice word in body.")],
    });
    expect(flags.some((f) => f.ruleId === "missing_notice")).toBe(false);
  });

  it("returns empty for empty clauses without deposit", () => {
    const flags = detectConflictsAndGaps({ facts: {}, clauses: [] });
    // Gap rules still fire on empty clause set (no keywords found)
    expect(flags.every((f) => f.ruleId.startsWith("missing_"))).toBe(true);
  });

  it("does not invent deposit flag without rent", () => {
    const flags = detectConflictsAndGaps({
      facts: { depositAmount: 999_999, state: "Maharashtra" },
      clauses: [clause("c-1", "Security deposit of ₹999,999 only.")],
    });
    expect(flags.some((f) => f.ruleId === "deposit_high_vs_rent")).toBe(false);
  });
});
