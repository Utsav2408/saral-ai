/**
 * POST /api/session/[token]/summary — facts + flags → one LLM → checklist.
 * Caches successful results on the session. Never logs document content.
 */

import { NextResponse } from "next/server";
import {
  clearSummaryLocks,
  releaseSummaryLock,
  tryAcquireSummaryLock,
} from "@/lib/ai/summary-lock";
import { runSummary } from "@/lib/ai/summary";
import { jsonError } from "@/lib/api/errors";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { SummaryResponse, SummaryResult } from "@/types/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/** Exported for tests to reset in-process locks between cases. */
export { clearSummaryLocks };

function toSummaryResponse(
  token: string,
  title: string,
  summary: SummaryResult,
  facts: SummaryResponse["facts"],
  cached: boolean,
): SummaryResponse {
  return {
    token,
    title,
    facts,
    flags: summary.flags,
    flagDescriptions: summary.flagDescriptions,
    checklist: summary.checklist,
    overview: summary.overview,
    cached,
  };
}

/**
 * POST /api/session/[token]/summary
 */
export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<
  NextResponse<SummaryResponse | { error: { code: string; message: string } }>
> {
  const started = Date.now();
  const { token } = await context.params;

  if (!sessionStore.isValidTokenFormat(token)) {
    safeLog({
      activity: "summary",
      ok: false,
      code: "INVALID_TOKEN",
      latencyMs: Date.now() - started,
    });
    return jsonError(400, "INVALID_TOKEN", "Invalid session token.");
  }

  const session = sessionStore.get(token);
  if (!session) {
    safeLog({
      activity: "summary",
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

  if (session.summary) {
    safeLog({
      activity: "summary",
      ok: true,
      cached: true,
      validated: true,
      flagCount: session.summary.flags.length,
      checklistCount: session.summary.checklist.length,
      clauseCount: session.clauses.length,
      latencyMs: Date.now() - started,
    });
    return NextResponse.json(
      toSummaryResponse(
        session.token,
        session.title,
        session.summary,
        session.facts,
        true,
      ),
    );
  }

  const lock = tryAcquireSummaryLock(token);
  if (!lock.ok) {
    safeLog({
      activity: "summary",
      ok: false,
      code: "RATE_LIMITED",
      clauseCount: session.clauses.length,
      latencyMs: Date.now() - started,
    });
    return jsonError(
      429,
      "RATE_LIMITED",
      "Summary is already running or was just requested. Try again shortly.",
    );
  }

  try {
    const result = await runSummary({ session });

    if (!result.ok) {
      const status =
        result.code === "AI_NOT_CONFIGURED"
          ? 503
          : result.code === "RATE_LIMITED"
            ? 429
            : result.code === "NO_CLAUSES" || result.code === "VALIDATION_FAILED"
              ? 422
              : 502;

      safeLog({
        activity: "summary",
        ok: false,
        code: result.code,
        validated: false,
        cached: false,
        clauseCount: session.clauses.length,
        inventedCount: result.inventedCount,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        latencyMs: Date.now() - started,
      });

      return jsonError(status, result.code, result.message);
    }

    const updated = sessionStore.update(token, {
      summary: result.summary,
      summaryCachedAt: Date.now(),
    });

    safeLog({
      activity: "summary",
      ok: true,
      validated: true,
      cached: false,
      flagCount: result.summary.flags.length,
      checklistCount: result.summary.checklist.length,
      clauseCount: session.clauses.length,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      latencyMs: Date.now() - started,
    });

    return NextResponse.json(
      toSummaryResponse(
        token,
        (updated ?? session).title,
        result.summary,
        (updated ?? session).facts,
        false,
      ),
    );
  } finally {
    releaseSummaryLock(token);
  }
}
