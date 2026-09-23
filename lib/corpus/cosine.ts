/**
 * Cosine similarity over dense float vectors.
 * Complexity: O(d) for dimension d.
 */

/**
 * Dot-product cosine similarity.
 * @throws if lengths differ or either vector is empty / zero-norm
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) {
    throw new Error("Vectors must be non-empty");
  }
  if (a.length !== b.length) {
    throw new Error("Vector length mismatch");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) {
    throw new Error("Zero-norm vector");
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
