/**
 * Lightweight lexical embedder for the demo corpus.
 *
 * Decision (Phase 3 plan option a): hashed character trigrams — same algorithm
 * offline (embed script) and at query time. Avoids loading bge-m3 / transformers
 * in the request path (cold-start + bundle size). Sufficient for ~20 curated chunks.
 *
 * Complexity: O(n · d) for text length n and fixed dimension d (384).
 */

/** Fixed embedding dimensionality. */
export const EMBEDDING_DIM = 384;

/** Algorithm id written into embeddings.json — must stay in sync. */
export const EMBED_ALGORITHM = "hashed_char_trigrams_v1" as const;

/**
 * FNV-1a 32-bit hash of a string.
 * Complexity: O(k) in string length.
 */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Normalize text for embedding: lowercase, collapse whitespace.
 */
export function normalizeForEmbed(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Embed text into a fixed-dim dense vector via signed hashed char trigrams.
 * Vectors are L2-normalized so cosine ≈ dot product.
 * Complexity: O(n · d) worst-case; typically O(n) with sparse updates then O(d) normalize.
 */
export function embedText(text: string): number[] {
  const normalized = normalizeForEmbed(text);
  const vec = new Float64Array(EMBEDDING_DIM);
  if (normalized.length < 3) {
    // Tiny queries: hash whole string into one bucket
    const h = fnv1a(normalized || "empty");
    const idx = h % EMBEDDING_DIM;
    const sign = h & 1 ? 1 : -1;
    vec[idx] = sign;
  } else {
    for (let i = 0; i <= normalized.length - 3; i++) {
      const gram = normalized.slice(i, i + 3);
      const h = fnv1a(gram);
      const idx = h % EMBEDDING_DIM;
      const sign = h & 1 ? 1 : -1;
      vec[idx]! += sign;
    }
  }

  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vec[i]! * vec[i]!;
  }
  norm = Math.sqrt(norm);
  const out = new Array<number>(EMBEDDING_DIM);
  if (norm === 0) {
    out.fill(0);
    out[0] = 1;
    return out;
  }
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    out[i] = vec[i]! / norm;
  }
  return out;
}
