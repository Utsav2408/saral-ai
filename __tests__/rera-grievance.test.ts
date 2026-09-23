import { afterEach, describe, expect, it } from "vitest";
import {
  RERA_DISPUTE_TYPES,
  clearReraTableCache,
  disputeTypesFromFlags,
  reraGrievanceCheck,
  reraGrievanceCheckMany,
} from "@/lib/tools/rera-grievance-check";

afterEach(() => {
  clearReraTableCache();
});

describe("reraGrievanceCheck", () => {
  it("returns an entry for every allowlisted dispute type", () => {
    for (const type of RERA_DISPUTE_TYPES) {
      const result = reraGrievanceCheck(type);
      expect(result.disputeType).toBe(type);
      expect(typeof result.applicable).toBe("boolean");
      expect(result.explanation.length).toBeGreaterThan(10);
    }
  });

  it("marks residential rent as not applicable", () => {
    const result = reraGrievanceCheck("residential_rent_dispute");
    expect(result.applicable).toBe(false);
  });

  it("marks promoter_allottee as applicable", () => {
    const result = reraGrievanceCheck("promoter_allottee");
    expect(result.applicable).toBe(true);
  });

  it("rejects unknown dispute types as not applicable", () => {
    const result = reraGrievanceCheck("made_up_type");
    expect(result.applicable).toBe(false);
    expect(result.explanation).toMatch(/unknown/i);
  });
});

describe("disputeTypesFromFlags / reraGrievanceCheckMany", () => {
  it("always includes residential_rent_dispute", () => {
    const types = disputeTypesFromFlags([]);
    expect(types).toContain("residential_rent_dispute");
  });

  it("maps deposit flags to deposit_refund", () => {
    const types = disputeTypesFromFlags(["deposit_high_vs_rent"]);
    expect(types).toContain("deposit_refund");
  });

  it("always returns at least one check", () => {
    const checks = reraGrievanceCheckMany([]);
    expect(checks.length).toBeGreaterThanOrEqual(1);
    expect(checks[0]!.disputeType).toBe("residential_rent_dispute");
  });
});
