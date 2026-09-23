/**
 * Central limits and allowlists for upload, parsing, GenAI activities, and
 * citation hosts. Keep these conservative to bound memory, token spend, and
 * DoS surface. Prefer importing from here over scattering magic numbers.
 */

/** Maximum upload size in bytes (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Maximum characters retained from extracted document text. */
export const MAX_TEXT_CHARS = 500_000;

/** Maximum number of clauses stored per session. */
export const MAX_CLAUSES = 200;

/** Maximum concurrent sessions in the in-memory Map. */
export const MAX_SESSIONS = 100;

/** Session time-to-live in milliseconds (2 hours). */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/** Allowed MIME types for Phase 1 (PDF + plain text only). */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
]);

/** Allowed file extensions (lowercase, with dot). */
export const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt"]);

/** sessionStorage key for the current Clarity session token. */
export const SESSION_STORAGE_KEY = "clarity_session";

/** Token must be base64url of 32 random bytes → 43 chars typically. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;

/** Max characters of each clause body sent to the LLM (cost / context bound). */
export const MAX_CLAUSE_CHARS_FOR_LLM = 2_000;

/**
 * Soft cap on clauses per Simplify call. Above this, refuse rather than
 * burn free-tier tokens on oversized leases.
 */
export const MAX_SIMPLIFY_CLAUSES = 80;

/** Approx output tokens budgeted per clause for maxOutputTokens. */
export const SIMPLIFY_TOKENS_PER_CLAUSE = 160;

/**
 * Extra maxOutputTokens for reasoning models (e.g. gpt-oss) that spend
 * reasoning tokens against the same completion budget as JSON text.
 */
export const SIMPLIFY_REASONING_HEADROOM = 768;

/** Floor for maxOutputTokens on a simplify call. */
export const SIMPLIFY_MIN_OUTPUT_TOKENS = 256;

/** Ceiling for maxOutputTokens on a simplify call. */
export const SIMPLIFY_MAX_OUTPUT_TOKENS = 8_192;

/**
 * Minimum ms between simplify attempts for the same token when not cached.
 * Protects Groq free-tier RPM during retries / double-clicks.
 */
export const SIMPLIFY_COOLDOWN_MS = 3_000;

/** Chat conversational history window sent to the model (3 exchanges). */
export const CHAT_HISTORY_WINDOW = 6;

/** Max messages retained on the session (UI may show all of these). */
export const MAX_CHAT_MESSAGES = 40;

/** Max characters in a single user chat message. */
export const MAX_CHAT_MESSAGE_CHARS = 2_000;

/** Top-k statute chunks retrieved per chat turn. */
export const STATUTE_TOP_K = 4;

/** Max characters of each retrieved chunk body put into the LLM prompt. */
export const MAX_CHUNK_CHARS_FOR_LLM = 1_200;

/**
 * Max characters of each lease clause packed into GenAI prompts
 * (chat durable context, summary grounding, options prompt).
 */
export const MAX_PROMPT_CLAUSE_CHARS = 400;

/** Soft cap on clauses included in GenAI prompts across activities. */
export const MAX_PROMPT_CLAUSES = 40;

/** Chat completion max output tokens. */
export const CHAT_MAX_OUTPUT_TOKENS = 1_024;

/**
 * Minimum ms between chat attempts for the same token.
 * Protects Groq free-tier RPM during retries / double-clicks.
 */
export const CHAT_COOLDOWN_MS = 2_000;

/**
 * Minimum ms between summary attempts for the same token when not cached.
 */
export const SUMMARY_COOLDOWN_MS = 3_000;

/**
 * Minimum ms between options attempts for the same token when not cached.
 */
export const OPTIONS_COOLDOWN_MS = 3_000;

/** Soft cap on conflict flags returned to the LLM / UI. */
export const MAX_CONFLICT_FLAGS = 20;

/** Soft cap on checklist items from Summary. */
export const MAX_SUMMARY_CHECKLIST = 12;

/** Summary completion max output tokens. */
export const SUMMARY_MAX_OUTPUT_TOKENS = 1_536;

/** Options completion max output tokens. */
export const OPTIONS_MAX_OUTPUT_TOKENS = 1_536;

/** Max dispute types evaluated per Options request (allowlisted set). */
export const MAX_RERA_DISPUTE_TYPES = 8;

/** Max characters of each clause scanned by Escalation Guard. */
export const MAX_ESCALATION_SCAN_CHARS = 4_000;

/**
 * Deposit ÷ monthly rent above this is "high vs typical" for Maharashtra.
 * UP / Model Tenancy residential cap is 2× — see detect_conflicts_and_gaps.
 */
export const DEPOSIT_MONTHS_TYPICAL_MH = 6;

/** Model Tenancy / UP residential security-deposit cap in months of rent. */
export const DEPOSIT_MONTHS_CAP_UP_MODEL = 2;

/**
 * Allowlisted hosts for citation outbound links in the Chat UI.
 * Keep in sync with docs/phase-3.md.
 */
export const CITATION_URL_ALLOWLIST = new Set([
  "www.indiacode.nic.in",
  "indiacode.nic.in",
  "upload.indiacode.nic.in",
  "maharera.mahaonline.gov.in",
  "www.up-rera.in",
  "up-rera.in",
  "www.mohua.gov.in",
  "mohua.gov.in",
  "prsindia.org",
  "www.prsindia.org",
  "indiankanoon.org",
  "www.indiankanoon.org",
]);
