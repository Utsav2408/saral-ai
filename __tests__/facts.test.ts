import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractFacts } from "@/lib/parse/facts";

const sample = readFileSync(
  join(process.cwd(), "fixtures/leases/sample-lease.txt"),
  "utf8",
);

describe("extractFacts", () => {
  it("extracts deposit, dates, notice, and state from sample lease", () => {
    const facts = extractFacts(sample);
    expect(facts.depositAmount).toBe(150000);
    expect(facts.depositCurrency).toBe("INR");
    expect(facts.leaseStart).toMatch(/1 Apr 2026/i);
    expect(facts.leaseEnd).toMatch(/31 Mar 2027/i);
    expect(facts.noticePeriod).toMatch(/1 month/i);
    expect(facts.state).toBe("Maharashtra");
    expect(facts.propertyType).toBe("Residential lease");
  });

  it("returns empty object when nothing matches", () => {
    expect(extractFacts("Hello world")).toEqual({});
  });

  it("parses alternate deposit phrasing", () => {
    const facts = extractFacts("₹2,00,000 as security deposit is payable.");
    expect(facts.depositAmount).toBe(200000);
  });

  it("parses notice with 'notice period of N days'", () => {
    const facts = extractFacts("The notice period of 30 days applies.");
    expect(facts.noticePeriod).toBe("30 days");
  });
});
