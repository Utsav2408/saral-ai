import { describe, expect, it } from "vitest";
import {
  entityCheck,
  extractNames,
  extractNumbers,
} from "@/lib/ai/entity-check";

describe("extractNumbers", () => {
  it("extracts Indian-style amounts and percentages", () => {
    const nums = extractNumbers(
      "Deposit of ₹1,50,000 and rent may rise by 10% yearly.",
    );
    expect(nums.has("150000")).toBe(true);
    expect(nums.has("10%")).toBe(true);
  });

  it("extracts simple dates with slashes", () => {
    const nums = extractNumbers("Starts 01/04/2026.");
    expect(nums.has("01/04/2026") || nums.has("1/4/2026")).toBe(true);
  });
});

describe("extractNames", () => {
  it("finds multi-word place names", () => {
    const names = extractNames("Property in Andheri West, Mumbai.");
    expect(names.has("andheri west")).toBe(true);
  });

  it("ignores landlord/tenant stopwords", () => {
    const names = extractNames("The Landlord and the Tenant agree.");
    expect(names.has("landlord")).toBe(false);
    expect(names.has("tenant")).toBe(false);
  });
});

describe("entityCheck", () => {
  it("passes when numbers and names are preserved", () => {
    const original =
      "The Tenant shall pay a security deposit of ₹1,50,000 in Maharashtra.";
    const paraphrase =
      "You pay a security deposit of ₹1,50,000. This applies in Maharashtra.";
    const result = entityCheck(original, paraphrase);
    expect(result.ok).toBe(true);
    expect(result.invented).toHaveLength(0);
  });

  it("allows omitting secondary detail", () => {
    const original =
      "Either party may terminate by giving 1 month prior notice in writing.";
    const paraphrase = "Either of you can end the lease with 1 month's notice.";
    const result = entityCheck(original, paraphrase);
    expect(result.ok).toBe(true);
  });

  it("fails when an amount is invented", () => {
    const original = "Deposit of ₹1,50,000.";
    const paraphrase = "You pay ₹2,00,000 as deposit.";
    const result = entityCheck(original, paraphrase);
    expect(result.ok).toBe(false);
    expect(result.invented.length).toBeGreaterThan(0);
  });

  it("fails when a name is invented", () => {
    const original = "The property is in Andheri West.";
    const paraphrase = "The property is in Bandra West.";
    const result = entityCheck(original, paraphrase);
    expect(result.ok).toBe(false);
    expect(result.invented.some((t) => /bandra/i.test(t))).toBe(true);
  });

  it("fails when a percentage is invented", () => {
    const original = "Rent may increase by 10% each year.";
    const paraphrase = "Rent can go up by 15% each year.";
    const result = entityCheck(original, paraphrase);
    expect(result.ok).toBe(false);
  });

  it("handles dates present in both", () => {
    const original = "The lease commencing from 1 Apr 2026.";
    const paraphrase = "Your lease starts on 1 Apr 2026.";
    const result = entityCheck(original, paraphrase);
    expect(result.ok).toBe(true);
  });
});
