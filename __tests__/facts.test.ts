import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractFacts } from "@/lib/parse/facts";

const sample = readFileSync(
  join(process.cwd(), "fixtures/leases/sample-lease.txt"),
  "utf8",
);

const upLease = readFileSync(
  join(process.cwd(), "fixtures/claude-generated/demo-lease-up-lucknow.txt"),
  "utf8",
);

const mhLease = readFileSync(
  join(
    process.cwd(),
    "fixtures/claude-generated/demo-lease-maharashtra-andheri-west.txt",
  ),
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

  it("parses ordinal dates with commas", () => {
    const facts = extractFacts(
      "The tenancy commencing from 1st June, 2026 and ending on 28th February, 2027.",
    );
    expect(facts.leaseStart).toMatch(/1\s+June\s+2026/i);
    expect(facts.leaseEnd).toMatch(/28\s+February\s+2027/i);
  });

  it("parses sum-of deposit with /- suffix", () => {
    const facts = extractFacts(
      "The Tenant has paid a sum of ₹37,000/- (Rupees Thirty-Seven Thousand only) as an interest-free refundable security deposit.",
    );
    expect(facts.depositAmount).toBe(37000);
  });

  it("parses one (1) calendar month's prior written notice", () => {
    const facts = extractFacts(
      "Either party may terminate by giving the other party one (1) calendar month's prior written notice.",
    );
    expect(facts.noticePeriod).toBe("1 month");
  });

  it("does not treat license fee as security deposit", () => {
    const facts = extractFacts(
      "The Licensee shall pay a monthly license fee of ₹28,000/- payable in advance.",
    );
    expect(facts.depositAmount).toBeUndefined();
  });

  it("extracts key facts from UP Lucknow demo lease", () => {
    const facts = extractFacts(upLease);
    expect(facts.depositAmount).toBe(37000);
    expect(facts.leaseStart).toMatch(/1\s+June\s+2026/i);
    expect(facts.noticePeriod).toBe("1 month");
    expect(facts.state).toBe("Uttar Pradesh");
    expect(facts.propertyType).toBe("Residential lease");
  });

  it("extracts key facts from Maharashtra Andheri demo lease", () => {
    const facts = extractFacts(mhLease);
    expect(facts.depositAmount).toBe(150000);
    expect(facts.leaseStart).toMatch(/1\s+April\s+2026/i);
    expect(facts.leaseEnd).toMatch(/28\s+February\s+2027/i);
    expect(facts.noticePeriod).toBe("1 month");
    expect(facts.state).toBe("Maharashtra");
    expect(facts.propertyType).toBe("Residential lease");
  });
});
