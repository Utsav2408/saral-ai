import { afterEach, describe, expect, it } from "vitest";
import { embedText } from "@/lib/corpus/embed";
import { clearCorpusCache, loadCorpus } from "@/lib/corpus/load";
import {
  clearStateLawCache,
  normalizeStateName,
  stateLawStatus,
} from "@/lib/tools/state-law-status";
import {
  eligibleStates,
  lookupStatute,
} from "@/lib/tools/lookup-statute";
import { cosineSimilarity } from "@/lib/corpus/cosine";

afterEach(() => {
  clearCorpusCache();
  clearStateLawCache();
});

describe("stateLawStatus", () => {
  it("resolves Maharashtra residential rent", () => {
    const r = stateLawStatus("Maharashtra", "residential_rent");
    expect(r.known).toBe(true);
    expect(r.code).toBe("rent_control");
    expect(r.stateCode).toBe("MH");
  });

  it("resolves UP aliases", () => {
    expect(normalizeStateName("UP")).toBe("Uttar Pradesh");
    const r = stateLawStatus("uttar pradesh", "residential_rent");
    expect(r.known).toBe(true);
    expect(r.code).toBe("urban_premises_tenancy");
  });

  it("returns unknown for other states", () => {
    const r = stateLawStatus("Karnataka", "residential_rent");
    expect(r.known).toBe(false);
    expect(r.code).toBe("unknown");
  });
});

describe("lookupStatute", () => {
  it("filters to MH-eligible states", () => {
    expect([...eligibleStates("MH")].sort()).toEqual(
      ["CENTRAL", "MH", "MODEL"].sort(),
    );
  });

  it("ranks deposit queries toward deposit chunks for MH", () => {
    const hits = lookupStatute({
      stateCode: "MH",
      query: "Can the landlord keep my security deposit and withhold money?",
      k: 4,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(4);
    // Should not return UP-only chunks
    for (const h of hits) {
      expect(["MH", "CENTRAL", "MODEL"]).toContain(h.state);
    }
  });

  it("ranks sublet queries toward sublet chunks", () => {
    const hits = lookupStatute({
      stateCode: "MH",
      query: "Can I sublet my flat or give it on licence?",
      k: 3,
    });
    const ids = hits.map((h) => h.id);
    expect(
      ids.some((id) => id.includes("s26") || id.includes("s16") || id.includes("s7")),
    ).toBe(true);
  });

  it("embedText is stable and similar for paraphrases", () => {
    const a = embedText("security deposit refund landlord");
    const b = embedText("landlord security deposit refund");
    expect(a.length).toBe(384);
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.5);
  });

  it("loadCorpus returns embedded chunks", () => {
    const corpus = loadCorpus();
    expect(corpus.length).toBeGreaterThanOrEqual(10);
    expect(corpus[0]!.embedding.length).toBe(384);
  });

  it("eligibleStates for UNKNOWN includes all tags", () => {
    expect(eligibleStates("UNKNOWN").has("MH")).toBe(true);
    expect(eligibleStates("UP").has("UP")).toBe(true);
  });

  it("parseEmbeddingsFile rejects bad input", async () => {
    const { parseEmbeddingsFile } = await import("@/lib/corpus/load");
    expect(() => parseEmbeddingsFile(null)).toThrow();
    expect(() =>
      parseEmbeddingsFile({ version: 2, algorithm: "x", dim: 1, chunks: [] }),
    ).toThrow();
  });

  it("embedText handles short strings", () => {
    const v = embedText("ab");
    expect(v.length).toBe(384);
    const empty = embedText("");
    expect(empty.length).toBe(384);
  });
});
