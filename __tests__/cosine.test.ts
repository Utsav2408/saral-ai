import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "@/lib/corpus/cosine";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("throws on empty vectors", () => {
    expect(() => cosineSimilarity([], [1])).toThrow(/non-empty/);
  });

  it("throws on length mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1])).toThrow(/mismatch/);
  });

  it("throws on zero-norm", () => {
    expect(() => cosineSimilarity([0, 0], [1, 0])).toThrow(/Zero-norm/);
  });
});
