/**
 * lookup_statute — state-filtered cosine top-k over the pre-embedded corpus.
 * Complexity: O(N · d) for N chunks and dimension d (N ≪ 100).
 */

import { cosineSimilarity } from "@/lib/corpus/cosine";
import { embedText } from "@/lib/corpus/embed";
import { loadCorpus } from "@/lib/corpus/load";
import type {
  CorpusState,
  EmbeddedChunk,
  StatuteHit,
} from "@/lib/corpus/types";
import { MAX_CHUNK_CHARS_FOR_LLM, STATUTE_TOP_K } from "@/lib/constants";

export type LookupStatuteOptions = {
  /** Session state code from regime lookup, or undefined. */
  stateCode?: CorpusState | "UNKNOWN";
  /** Raw query text — embedded with the same algorithm as the corpus. */
  query: string;
  k?: number;
  /** Inject corpus (tests). */
  corpus?: EmbeddedChunk[];
  /** Max chars of chunk text returned. */
  maxChars?: number;
};

/**
 * Which corpus states are eligible for a session state.
 * CENTRAL + MODEL always included for shared / comparative grounding.
 */
export function eligibleStates(
  stateCode: CorpusState | "UNKNOWN" | undefined,
): Set<CorpusState> {
  if (stateCode === "MH") {
    return new Set(["MH", "CENTRAL", "MODEL"]);
  }
  if (stateCode === "UP") {
    return new Set(["UP", "CENTRAL", "MODEL"]);
  }
  // Unknown: allow all pilot chunks (demo still retrieves something)
  return new Set(["MH", "UP", "CENTRAL", "MODEL"]);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/**
 * Retrieve top-k statute chunks for a query.
 */
export function lookupStatute(options: LookupStatuteOptions): StatuteHit[] {
  const k = Math.max(1, Math.min(options.k ?? STATUTE_TOP_K, 10));
  const maxChars = options.maxChars ?? MAX_CHUNK_CHARS_FOR_LLM;
  const corpus = options.corpus ?? loadCorpus();
  const allowed = eligibleStates(options.stateCode);
  const queryEmbedding = embedText(options.query);

  const scored: { chunk: EmbeddedChunk; score: number }[] = [];
  for (const chunk of corpus) {
    if (!allowed.has(chunk.state)) continue;
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    scored.push({ chunk, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(({ chunk, score }) => ({
    id: chunk.id,
    score,
    citationLabel: chunk.citationLabel,
    sourceUrl: chunk.sourceUrl,
    instrument: chunk.instrument,
    section: chunk.section,
    state: chunk.state,
    text: truncate(chunk.text, maxChars),
  }));
}
