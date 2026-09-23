/**
 * Offline embed pipeline: chunks JSON → embeddings.json.
 * Run: npx tsx scripts/embed-corpus.ts
 *
 * Uses the same hashed-trigram embedder as runtime (no transformers download).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMBED_ALGORITHM,
  EMBEDDING_DIM,
  embedText,
} from "../lib/corpus/embed";
import type { CorpusChunk, EmbeddingsFile } from "../lib/corpus/types";

const root = join(import.meta.dirname, "..");
const chunksPath = join(root, "data/corpus/chunks/pilot-corpus.json");
const outPath = join(root, "data/corpus/embeddings.json");

const raw = JSON.parse(readFileSync(chunksPath, "utf8")) as CorpusChunk[];
if (!Array.isArray(raw) || raw.length === 0) {
  throw new Error("No chunks found");
}

const chunks = raw.map((c) => {
  if (!c.id || !c.text || !c.state) {
    throw new Error(`Invalid chunk: ${JSON.stringify(c).slice(0, 80)}`);
  }
  // Embed label + themes + text for better retrieval of short queries
  const embedInput = `${c.citationLabel} ${c.instrument} section ${c.section} ${(c.themes ?? []).join(" ")} ${c.text}`;
  return {
    ...c,
    embedding: embedText(embedInput),
  };
});

const file: EmbeddingsFile = {
  version: 1,
  algorithm: EMBED_ALGORITHM,
  dim: EMBEDDING_DIM,
  generatedAt: new Date().toISOString(),
  chunks,
};

writeFileSync(outPath, `${JSON.stringify(file)}\n`, "utf8");
console.log(
  `Wrote ${chunks.length} embeddings (dim=${EMBEDDING_DIM}) → ${outPath}`,
);
