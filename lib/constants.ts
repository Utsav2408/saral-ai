/**
 * Central limits and allowlists for Phase 1 upload / parsing.
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
