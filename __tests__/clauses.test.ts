import { describe, expect, it } from "vitest";
import { parseClauses } from "@/lib/parse/clauses";
import { MAX_CLAUSES } from "@/lib/constants";

describe("parseClauses", () => {
  it("splits numbered clauses", () => {
    const text = `
1. First clause about deposit.
2. Second clause about notice.
3. Third clause about rent.
`;
    const clauses = parseClauses(text);
    expect(clauses).toHaveLength(3);
    expect(clauses[0]?.id).toBe("c-1");
    expect(clauses[0]?.text).toContain("First clause");
    expect(clauses[2]?.index).toBe(3);
  });

  it("falls back to paragraphs when numbering is sparse", () => {
    const text = "Intro paragraph only.\n\nSecond paragraph here.\n\nThird one.";
    const clauses = parseClauses(text);
    expect(clauses.length).toBe(3);
    expect(clauses[1]?.text).toBe("Second paragraph here.");
  });

  it("returns empty array for blank input", () => {
    expect(parseClauses("   \n  ")).toEqual([]);
  });

  it("caps clause count", () => {
    const parts = Array.from({ length: MAX_CLAUSES + 20 }, (_, i) => `${i + 1}. Clause ${i + 1}.`);
    const clauses = parseClauses(parts.join("\n"));
    expect(clauses).toHaveLength(MAX_CLAUSES);
  });

  it("detects heading ending with colon", () => {
    const text = "1. Deposit:\nPay ₹10,000.\n2. Notice:\nOne month.";
    const clauses = parseClauses(text);
    expect(clauses[0]?.heading).toBe("Deposit");
  });
});
