/**
 * Corpus chunk + embedding types for Phase 3 retrieval.
 */

/** Jurisdiction tag on a curated statute chunk. */
export type CorpusState = "MH" | "UP" | "CENTRAL" | "MODEL";

/** Hand-curated statute excerpt (pre-embed input). */
export type CorpusChunk = {
  id: string;
  state: CorpusState;
  instrument: string;
  section: string;
  citationLabel: string;
  sourceUrl: string;
  themes: string[];
  text: string;
  notes?: string;
};

/** Chunk with a precomputed embedding vector. */
export type EmbeddedChunk = CorpusChunk & {
  /** Unit-ish hashed lexical vector; length = EMBEDDING_DIM. */
  embedding: number[];
};

/** On-disk embeddings artifact shape. */
export type EmbeddingsFile = {
  version: 1;
  /** Embedding algorithm id — must match runtime embedText. */
  algorithm: "hashed_char_trigrams_v1";
  dim: number;
  generatedAt: string;
  chunks: EmbeddedChunk[];
};

/** A retrieval hit returned to chat orchestration. */
export type StatuteHit = {
  id: string;
  score: number;
  citationLabel: string;
  sourceUrl: string;
  instrument: string;
  section: string;
  state: CorpusState;
  /** Truncated text for the LLM prompt (never log this). */
  text: string;
};
