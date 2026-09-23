/**
 * Central limits and allowlists for upload / parsing / Simplify.
 * Keep these conservative to bound memory and DoS surface.
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
export const SIMPLIFY_TOKENS_PER_CLAUSE = 120;

/** Floor for maxOutputTokens on a simplify call. */
export const SIMPLIFY_MIN_OUTPUT_TOKENS = 256;

/** Ceiling for maxOutputTokens on a simplify call. */
export const SIMPLIFY_MAX_OUTPUT_TOKENS = 8_192;

/**
 * Minimum ms between simplify attempts for the same token when not cached.
 * Protects Groq free-tier RPM during retries / double-clicks.
 */
export const SIMPLIFY_COOLDOWN_MS = 3_000;
