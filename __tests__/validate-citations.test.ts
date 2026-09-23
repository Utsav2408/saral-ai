import { describe, expect, it } from "vitest";
import {
  enrichCitations,
  normalizeCitationId,
  validateCitations,
} from "@/lib/ai/validate-citations";

describe("validateCitations", () => {
  const retrieved = new Set(["mh-mrca-s15", "mh-mrca-s26"]);
  const lease = new Set(["c-1", "c-2"]);

  it("normalizes bare clause ids", () => {
    expect(normalizeCitationId("c-2")).toBe("lease:c-2");
  });

  it("passes valid statute + lease citations", () => {
    const result = validateCitations({
      answer: "Under the Act, deposit deductions need a basis. See your lease.",
      citations: [
        { id: "mh-mrca-s15", label: "Maharashtra Rent Control Act" },
        { id: "lease:c-2", label: "Your lease · Clause 2" },
      ],
      retrievedIds: retrieved,
      leaseClauseIds: lease,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.citations).toHaveLength(2);
    }
  });

  it("rejects forged statute ids", () => {
    const result = validateCitations({
      answer: "The statute says you may withhold the deposit.",
      citations: [{ id: "fake-id", label: "Fake" }],
      retrievedIds: retrieved,
      leaseClauseIds: lease,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forged_id");
  });

  it("rejects forged lease ids", () => {
    const result = validateCitations({
      answer: "Your lease deposit clause allows this.",
      citations: [{ id: "lease:c-99", label: "Clause 99" }],
      retrievedIds: retrieved,
      leaseClauseIds: lease,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects statute claims without citations", () => {
    const result = validateCitations({
      answer: "Under the Maharashtra Rent Control Act the landlord may evict you.",
      citations: [],
      retrievedIds: retrieved,
      leaseClauseIds: lease,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_statute_citation");
  });

  it("rejects empty answers", () => {
    const result = validateCitations({
      answer: "   ",
      citations: [],
      retrievedIds: retrieved,
      leaseClauseIds: lease,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty_answer");
  });
});

describe("enrichCitations", () => {
  it("fills labels and source URLs from hits and clauses", () => {
    const enriched = enrichCitations(
      [
        { id: "mh-mrca-s15", label: "" },
        { id: "lease:c-1", label: "" },
      ],
      [
        {
          id: "mh-mrca-s15",
          citationLabel: "MRCA §15",
          sourceUrl: "https://www.indiacode.nic.in/example",
        },
      ],
      [{ id: "c-1", index: 1 }],
    );
    expect(enriched[0]?.label).toBe("MRCA §15");
    expect(enriched[0]?.sourceUrl).toContain("indiacode");
    expect(enriched[1]?.label).toBe("Your lease · Clause 1");
  });
});
