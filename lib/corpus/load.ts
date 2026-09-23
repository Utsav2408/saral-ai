/**
 * Load pre-embedded corpus from data/corpus/embeddings.json (singleton).
 * Complexity: O(N · d) once per process; O(1) thereafter.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMBED_ALGORITHM, EMBEDDING_DIM } from "@/lib/corpus/embed";
import type { EmbeddedChunk, EmbeddingsFile } from "@/lib/corpus/types";

let cached: EmbeddedChunk[] | null = null;

/**
 * Resolve embeddings path. Override via CLARITY_EMBEDDINGS_PATH (tests).
 * Path is statically scoped under data/corpus for Turbopack tracing.
 */
export function embeddingsPath(): string {
  const override = process.env.CLARITY_EMBEDDINGS_PATH?.trim();
  if (override) {
    return override;
  }
  return join(process.cwd(), "data", "corpus", "embeddings.json");
}

/**
 * Validate and return chunks from an embeddings file object.
 */
export function parseEmbeddingsFile(raw: unknown): EmbeddedChunk[] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid embeddings file");
  }
  const file = raw as EmbeddingsFile;
  if (file.version !== 1) {
    throw new Error("Unsupported embeddings version");
  }
  if (file.algorithm !== EMBED_ALGORITHM) {
    throw new Error(`Embedding algorithm mismatch: ${file.algorithm}`);
  }
  if (file.dim !== EMBEDDING_DIM) {
    throw new Error(`Embedding dim mismatch: ${file.dim}`);
  }
  if (!Array.isArray(file.chunks) || file.chunks.length === 0) {
    throw new Error("Embeddings file has no chunks");
  }
  for (const chunk of file.chunks) {
    if (!chunk.id || !Array.isArray(chunk.embedding)) {
      throw new Error("Malformed embedded chunk");
    }
    if (chunk.embedding.length !== EMBEDDING_DIM) {
      throw new Error(`Chunk ${chunk.id} has wrong embedding length`);
    }
  }
  return file.chunks;
}

/**
 * Load corpus embeddings (cached).
 * Complexity: O(N · d) first call; O(1) after.
 */
export function loadCorpus(): EmbeddedChunk[] {
  if (cached) {
    return cached;
  }
  const path = embeddingsPath();
  const raw = JSON.parse(
    readFileSync(/*turbopackIgnore: true*/ path, "utf8"),
  ) as unknown;
  cached = parseEmbeddingsFile(raw);
  return cached;
}

/** Tests only — clear singleton. */
export function clearCorpusCache(): void {
  cached = null;
}

/** Tests — inject corpus without reading disk. */
export function setCorpusForTests(chunks: EmbeddedChunk[] | null): void {
  cached = chunks;
}
