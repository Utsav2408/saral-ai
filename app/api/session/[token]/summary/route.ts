/**
 * POST /api/session/[token]/summary — facts + flags → one LLM → checklist.
 * Caches successful results on the session. Never logs document content.
 */

import { NextResponse } from "next/server";
import { runSummary } from "@/lib/ai/summary";
import { summaryLock } from "@/lib/ai/token-lock";
import {
  activityFailureResponse,
  handleActivityRequest,
  rateLimitedResponse,
} from "@/lib/api/activity-route";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { withTokenLock } from "@/lib/api/with-token-lock";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { SummaryResponse, SummaryResult } from "@/types/session";

export const runtime = "nodejs";

/** Exported for tests to reset in-process locks between cases. */
export const clearSummaryLocks = summaryLock.clear;

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
  context: SessionRouteContext,
): Promise<
  NextResponse<SummaryResponse | { error: { code: string; message: string } }>
> {
  return handleActivityRequest("summary", context, async ({ token, session, started }) => {
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

    return withTokenLock({
      tryAcquire: summaryLock.tryAcquire,
      release: summaryLock.release,
      token,
      blocked: () =>
        rateLimitedResponse(
          "summary",
          started,
          "Summary is already running or was just requested. Try again shortly.",
          { clauseCount: session.clauses.length },
        ),
      work: async () => {
        const result = await runSummary({ session });

        if (!result.ok) {
          return activityFailureResponse(
            "summary",
            started,
            result.code,
            result.message,
            {
              clauseCount: session.clauses.length,
              inventedCount: result.inventedCount,
              usage: result.usage,
            },
          );
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
      },
    });
  });
}
