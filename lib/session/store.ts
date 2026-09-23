import { randomBytes } from "node:crypto";
import {
  MAX_SESSIONS,
  SESSION_TTL_MS,
  TOKEN_PATTERN,
} from "@/lib/constants";
import type {
  Clause,
  ExtractedFacts,
  OptionsResult,
  Session,
  SessionPublic,
  SimplifiedClause,
  SummaryResult,
} from "@/types/session";

type CreateSessionInput = {
  title: string;
  sourceFilename: string;
  mimeType: string;
  rawTextLength: number;
  clauses: Clause[];
  facts: ExtractedFacts;
};

/** Patchable fields for session updates (Simplify / Summary / Options cache). */
type SessionUpdatePatch = {
  simplifiedClauses?: SimplifiedClause[];
  simplifyCachedAt?: number;
  messages?: Session["messages"];
  summary?: SummaryResult;
  summaryCachedAt?: number;
  options?: OptionsResult;
  optionsCachedAt?: number;
  escalation?: boolean;
};

/**
 * Process-local session store.
 * O(1) get/set; eviction scans the Map infrequently (O(n) on bound breach).
 *
 * Note: in-memory Map is correct for long-running `next start` / Docker.
 * Serverless platforms that do not share memory across invocations need KV later.
 */
class SessionStore {
  private readonly sessions = new Map<string, Session>();

  /**
   * Generate a 256-bit base64url session token.
   * Complexity: O(1).
   */
  createToken(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Validate token shape before Map lookup (rejects injection / oversized keys).
   */
  isValidTokenFormat(token: string): boolean {
    return TOKEN_PATTERN.test(token);
  }

  /**
   * Create and store a session. Evicts expired and oldest sessions as needed.
   */
  create(input: CreateSessionInput): Session {
    this.evictExpired();
    if (this.sessions.size >= MAX_SESSIONS) {
      this.evictOldest();
    }

    const token = this.createToken();
    const session: Session = {
      token,
      createdAt: Date.now(),
      title: input.title,
      sourceFilename: input.sourceFilename,
      mimeType: input.mimeType,
      rawTextLength: input.rawTextLength,
      clauses: input.clauses,
      facts: input.facts,
      messages: [],
    };
    this.sessions.set(token, session);
    return session;
  }

  /**
   * Lookup by token. Returns undefined if missing or expired.
   * Complexity: O(1) average.
   */
  get(token: string): Session | undefined {
    if (!this.isValidTokenFormat(token)) {
      return undefined;
    }
    const session = this.sessions.get(token);
    if (!session) {
      return undefined;
    }
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      this.sessions.delete(token);
      return undefined;
    }
    return session;
  }

  /**
   * Merge a patch into an existing session. Preserves token and createdAt.
   * Complexity: O(1).
   *
   * @returns Updated session, or undefined if missing/expired.
   */
  update(token: string, patch: SessionUpdatePatch): Session | undefined {
    const session = this.get(token);
    if (!session) {
      return undefined;
    }
    const updated: Session = {
      ...session,
      ...patch,
    };
    this.sessions.set(token, updated);
    return updated;
  }

  /** Remove a session explicitly (e.g. tests). */
  delete(token: string): boolean {
    return this.sessions.delete(token);
  }

  /** Current size — for tests / metrics. */
  size(): number {
    return this.sessions.size;
  }

  /** Clear all sessions — tests only. */
  clear(): void {
    this.sessions.clear();
  }

  /** Public DTO without internal-only fields. */
  toPublic(session: Session): SessionPublic {
    return {
      token: session.token,
      title: session.title,
      sourceFilename: session.sourceFilename,
      mimeType: session.mimeType,
      createdAt: session.createdAt,
      clauses: session.clauses,
      facts: session.facts,
      clauseCount: session.clauses.length,
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(token);
      }
    }
  }

  private evictOldest(): void {
    let oldestToken: string | undefined;
    let oldestCreated = Number.POSITIVE_INFINITY;
    for (const [token, session] of this.sessions) {
      if (session.createdAt < oldestCreated) {
        oldestCreated = session.createdAt;
        oldestToken = token;
      }
    }
    if (oldestToken) {
      this.sessions.delete(oldestToken);
    }
  }
}

/** Singleton store shared across API route modules in one Node process. */
export const sessionStore = new SessionStore();

/** Exported class for isolated unit tests. */
export { SessionStore };
