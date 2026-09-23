import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { SessionPublic } from "@/types/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/**
 * GET /api/session/[token] — return parsed clauses and facts for Overview.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<SessionPublic | { error: { code: string; message: string } }>> {
  const started = Date.now();
  const { token } = await context.params;

  if (!sessionStore.isValidTokenFormat(token)) {
    safeLog({
      activity: "session_get",
      ok: false,
      code: "INVALID_TOKEN",
      latencyMs: Date.now() - started,
    });
    return jsonError(400, "INVALID_TOKEN", "Invalid session token.");
  }

  const session = sessionStore.get(token);
  if (!session) {
    safeLog({
      activity: "session_get",
      ok: false,
      code: "NOT_FOUND",
      latencyMs: Date.now() - started,
    });
    return jsonError(
      404,
      "NOT_FOUND",
      "Session not found or expired. Please upload your document again.",
    );
  }

  safeLog({
    activity: "session_get",
    ok: true,
    clauseCount: session.clauses.length,
    latencyMs: Date.now() - started,
  });

  return NextResponse.json(sessionStore.toPublic(session));
}
