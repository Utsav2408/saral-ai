/**
 * POST /api/session/[token]/simplify — one LLM call for all clauses.
 * Caches successful results on the session. Never logs document content.
 */

import { NextResponse } from "next/server";
import { runSimplify } from "@/lib/ai/simplify";
import { simplifyLock } from "@/lib/ai/token-lock";
import {
  activityFailureResponse,
  handleActivityRequest,
  rateLimitedResponse,
} from "@/lib/api/activity-route";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { withTokenLock } from "@/lib/api/with-token-lock";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { SimplifyResponse } from "@/types/session";

export const runtime = "nodejs";

/** Exported for tests to reset in-process locks between cases. */
export const clearSimplifyLocks = simplifyLock.clear;

function toSimplifyResponse(
  token: string,
  title: string,
  clauses: SimplifyResponse["clauses"],
  simplifiedClauses: SimplifyResponse["simplifiedClauses"],
  cached: boolean,
): SimplifyResponse {
  return { token, title, clauses, simplifiedClauses, cached };
}

/**
 * POST /api/session/[token]/simplify
 */
export async function POST(
  _request: Request,
  context: SessionRouteContext,
): Promise<
  NextResponse<SimplifyResponse | { error: { code: string; message: string } }>
> {
  return handleActivityRequest("simplify", context, async ({ token, session, started }) => {
    if (session.simplifiedClauses && session.simplifiedClauses.length > 0) {
      safeLog({
        activity: "simplify",
        ok: true,
        cached: true,
        validated: true,
        clauseCount: session.clauses.length,
        latencyMs: Date.now() - started,
      });
      return NextResponse.json(
        toSimplifyResponse(
          session.token,
          session.title,
          session.clauses,
          session.simplifiedClauses,
          true,
        ),
      );
    }

    return withTokenLock({
      tryAcquire: simplifyLock.tryAcquire,
      release: simplifyLock.release,
      token,
      blocked: () =>
        rateLimitedResponse(
          "simplify",
          started,
          "Simplify is already running or was just requested. Try again shortly.",
          { clauseCount: session.clauses.length },
        ),
      work: async () => {
        const result = await runSimplify({ clauses: session.clauses });

        if (!result.ok) {
          return activityFailureResponse(
            "simplify",
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
          simplifiedClauses: result.simplified,
          simplifyCachedAt: Date.now(),
        });

        safeLog({
          activity: "simplify",
          ok: true,
          validated: true,
          cached: false,
          clauseCount: session.clauses.length,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          latencyMs: Date.now() - started,
        });

        return NextResponse.json(
          toSimplifyResponse(
            token,
            (updated ?? session).title,
            (updated ?? session).clauses,
            result.simplified,
            false,
          ),
        );
      },
    });
  });
}
