import { NextResponse } from "next/server";
import {
  requireSession,
  type SessionRouteContext,
} from "@/lib/api/require-session";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { SessionPublic } from "@/types/session";

export const runtime = "nodejs";

/**
 * GET /api/session/[token] — return parsed clauses and facts for Overview.
 */
export async function GET(
  _request: Request,
  context: SessionRouteContext,
): Promise<NextResponse<SessionPublic | { error: { code: string; message: string } }>> {
  const started = Date.now();
  const { token } = await context.params;
  const gate = requireSession(token, "session_get", started);
  if (!gate.ok) return gate.response;

  safeLog({
    activity: "session_get",
    ok: true,
    clauseCount: gate.session.clauses.length,
    latencyMs: Date.now() - started,
  });

  return NextResponse.json(sessionStore.toPublic(gate.session));
}
