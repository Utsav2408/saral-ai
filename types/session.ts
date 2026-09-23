/**
 * Shared domain types for ephemeral Clarity sessions.
 * Sessions live only in process memory and never persist to disk.
 */

/** A single parsed clause from an uploaded lease. */
export interface Clause {
  /** Stable id within the session, e.g. `c-1`. */
  id: string;
  /** 1-based display index. */
  index: number;
  /** Optional short heading if detected at the start of the clause. */
  heading?: string;
  /** Full clause body text. */
  text: string;
}

/**
 * Regex-extracted facts. Every field is optional — extraction may miss values
 * without failing the upload pipeline.
 */
export interface ExtractedFacts {
  depositAmount?: number;
  depositCurrency?: string;
  leaseStart?: string;
  leaseEnd?: string;
  noticePeriod?: string;
  state?: string;
  propertyType?: string;
}

/** Chat message placeholder for later phases; Phase 1 keeps this empty. */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * In-memory session created on successful upload.
 * Raw file bytes are never stored — only derived text structures.
 */
export interface Session {
  token: string;
  createdAt: number;
  title: string;
  sourceFilename: string;
  mimeType: string;
  /** Character length of extracted text (metadata only; text itself not retained long-term beyond clauses). */
  rawTextLength: number;
  clauses: Clause[];
  facts: ExtractedFacts;
  messages: ChatMessage[];
}

/** Public DTO returned by GET /api/session/[token]. */
export interface SessionPublic {
  token: string;
  title: string;
  sourceFilename: string;
  mimeType: string;
  createdAt: number;
  clauses: Clause[];
  facts: ExtractedFacts;
  clauseCount: number;
}

/** Compact response from POST /api/upload. */
export interface UploadResponse {
  token: string;
  title: string;
  facts: ExtractedFacts;
  clauseCount: number;
}

/** Structured API error body — never includes stack traces. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
