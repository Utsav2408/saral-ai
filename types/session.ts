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

/** Citation attached to an assistant chat message. */
export interface ChatCitation {
  /** Corpus chunk id or `lease:c-N`. */
  id: string;
  /** Short label for citation pills. */
  label: string;
  /** Optional allowlisted source URL. */
  sourceUrl?: string;
}

/** Chat message stored on the session. */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  citations?: ChatCitation[];
}

/**
 * Plain-language paraphrase of one clause from the Simplify activity.
 * Cached on the session after a successful entity_check pass.
 */
export interface SimplifiedClause {
  /** Matches {@link Clause.id}. */
  clauseId: string;
  /** Plain-language paraphrase — never invents numbers or names. */
  simpleText: string;
  /** Always true when cached; retained for auditability. */
  entityCheckPassed: boolean;
}

/** Severity for a deterministic conflict / gap flag. */
type ConflictSeverity = "info" | "warning" | "critical";

/**
 * Rule-based conflict or gap detected before Summary / Options.
 * Human prose is produced by the LLM; this is metadata only.
 */
export interface ConflictFlag {
  /** Stable id for this flag instance, e.g. `flag-deposit_high_vs_rent`. */
  id: string;
  /** Rule that fired, e.g. `deposit_high_vs_rent`. */
  ruleId: string;
  severity: ConflictSeverity;
  /** Machine key for LLM / i18n — never user-facing prose alone. */
  summaryKey: string;
  /** Lease clause ids that contributed evidence. */
  clauseIds?: string[];
  /** Fact field names referenced (e.g. depositAmount). */
  factRefs?: string[];
}

/** One checklist row from the Summary activity. */
export interface SummaryChecklistItem {
  id: string;
  /** Optional link back to a ConflictFlag.id. */
  flagId?: string;
  text: string;
  priority: "high" | "medium" | "low";
}

/** Cached Summary activity output. */
export interface SummaryResult {
  flags: ConflictFlag[];
  /** LLM-written short description per flag id. */
  flagDescriptions: { flagId: string; description: string }[];
  checklist: SummaryChecklistItem[];
  overview: string;
}

/** One next-step option from the Options activity. */
export interface OptionsStep {
  id: string;
  title: string;
  body: string;
  citations?: ChatCitation[];
}

/** Regime summary returned with chat / options responses. */
export interface ChatRegimeDto {
  state: string;
  category: string;
  code: string;
  label: string;
}

/** RERA applicability row surfaced in Options. */
export interface ReraCheckResult {
  disputeType: string;
  applicable: boolean;
  explanation: string;
  citeChunkId?: string;
}

/** Cached Options activity output. */
export interface OptionsResult {
  escalation: boolean;
  reraChecks: ReraCheckResult[];
  steps: OptionsStep[];
  regime: ChatRegimeDto;
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
  /** Cached Simplify output — set after first successful POST /simplify. */
  simplifiedClauses?: SimplifiedClause[];
  /** Locale used when simplify cache was written (`en` | `hi`). */
  simplifyLocale?: "en" | "hi";
  /** Epoch ms when simplify cache was written. */
  simplifyCachedAt?: number;
  /** Cached Summary output — set after first successful POST /summary. */
  summary?: SummaryResult;
  /** Epoch ms when summary cache was written. */
  summaryCachedAt?: number;
  /** Cached Options output — set after first successful POST /options. */
  options?: OptionsResult;
  /** Epoch ms when options cache was written. */
  optionsCachedAt?: number;
  /**
   * Escalation Guard triggered for this session.
   * Sticky until session TTL; never cleared mid-session.
   */
  escalation?: boolean;
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

/**
 * Response from POST /api/session/[token]/simplify.
 * Includes originals so the UI can toggle without a second fetch.
 */
export interface SimplifyResponse {
  token: string;
  title: string;
  clauses: Clause[];
  simplifiedClauses: SimplifiedClause[];
  /** True when the result was served from session cache (no Groq call). */
  cached: boolean;
}

/**
 * Response from POST /api/session/[token]/chat.
 */
export interface ChatResponse {
  token: string;
  title: string;
  reply: ChatMessage;
  messages: ChatMessage[];
  regime: ChatRegimeDto;
}

/**
 * Response from POST /api/session/[token]/summary.
 */
export interface SummaryResponse {
  token: string;
  title: string;
  facts: ExtractedFacts;
  flags: ConflictFlag[];
  flagDescriptions: { flagId: string; description: string }[];
  checklist: SummaryChecklistItem[];
  overview: string;
  /** True when served from session cache (no Groq call). */
  cached: boolean;
}

/**
 * Response from POST /api/session/[token]/options.
 */
export interface OptionsResponse {
  token: string;
  title: string;
  escalation: boolean;
  reraChecks: ReraCheckResult[];
  steps: OptionsStep[];
  regime: ChatRegimeDto;
  /** True when served from session cache (no Groq call). */
  cached: boolean;
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
