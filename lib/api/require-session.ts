/**
 * Shared session token gate for activity API routes.
 * Complexity: O(1).
 */

import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { safeLog, type ClarityActivity } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { Session } from "@/types/session";

const SESSION_NOT_FOUND_MESSAGE =
  "Session not found or expired. Please upload your document again.";

/** Next.js App Router context for `/api/session/[token]/…` handlers. */
export type SessionRouteContext = {
  params: Promise<{ token: string }>;
};

export type RequireSessionResult =
  | { ok: true; token: string; session: Session }
  | {
      ok: false;
      response: NextResponse<{ error: { code: string; message: string } }>;
    };

/**
 * Validate token format and load a live session, logging failures with latency.
 */
export function requireSession(
  token: string,
  activity: ClarityActivity,
  started: number,
): RequireSessionResult {
  if (!sessionStore.isValidTokenFormat(token)) {
    safeLog({
      activity,
      ok: false,
      code: "INVALID_TOKEN",
      latencyMs: Date.now() - started,
    });
    return {
      ok: false,
      response: jsonError(400, "INVALID_TOKEN", "Invalid session token."),
    };
  }

  const session = sessionStore.get(token);
  if (!session) {
    safeLog({
      activity,
      ok: false,
      code: "NOT_FOUND",
      latencyMs: Date.now() - started,
    });
    return {
      ok: false,
      response: jsonError(404, "NOT_FOUND", SESSION_NOT_FOUND_MESSAGE),
    };
  }

  return { ok: true, token, session };
}
