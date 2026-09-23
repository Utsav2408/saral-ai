/**
 * POST /api/session/[token]/options — escalation → RERA → retrieval → one LLM.
 * Caches successful results. Never logs document content or matched escalation terms.
 */

import { NextResponse } from "next/server";
import { runOptions } from "@/lib/ai/options";
import { optionsLock } from "@/lib/ai/token-lock";
import {
  activityFailureResponse,
  handleActivityRequest,
  rateLimitedResponse,
} from "@/lib/api/activity-route";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { withTokenLock } from "@/lib/api/with-token-lock";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { OptionsResponse, OptionsResult } from "@/types/session";

export const runtime = "nodejs";

/** Exported for tests to reset in-process locks between cases. */
export const clearOptionsLocks = optionsLock.clear;

function toOptionsResponse(
  token: string,
  title: string,
  options: OptionsResult,
  cached: boolean,
): OptionsResponse {
  return {
    token,
    title,
    escalation: options.escalation,
    reraChecks: options.reraChecks,
    steps: options.steps,
    regime: options.regime,
    cached,
  };
}

/**
 * POST /api/session/[token]/options
 */
export async function POST(
  _request: Request,
  context: SessionRouteContext,
): Promise<
  NextResponse<OptionsResponse | { error: { code: string; message: string } }>
> {
  return handleActivityRequest("options", context, async ({ token, session, started }) => {
    if (session.options) {
      safeLog({
        activity: "options",
        ok: true,
        cached: true,
        validated: true,
        escalation: session.options.escalation,
        clauseCount: session.clauses.length,
        latencyMs: Date.now() - started,
      });
      return NextResponse.json(
        toOptionsResponse(
          session.token,
          session.title,
          session.options,
          true,
        ),
      );
    }

    return withTokenLock({
      tryAcquire: optionsLock.tryAcquire,
      release: optionsLock.release,
      token,
      blocked: () =>
        rateLimitedResponse(
          "options",
          started,
          "Options is already running or was just requested. Try again shortly.",
          { clauseCount: session.clauses.length },
        ),
      work: async () => {
        const result = await runOptions({ session });

        // Persist sticky escalation even on failure when the guard ran.
        if (result.ok === false && result.escalation) {
          sessionStore.update(token, { escalation: true });
        }

        if (!result.ok) {
          return activityFailureResponse(
            "options",
            started,
            result.code,
            result.message,
            {
              clauseCount: session.clauses.length,
              escalation: result.escalation ?? session.escalation,
              usage: result.usage,
            },
          );
        }

        const updated = sessionStore.update(token, {
          options: result.options,
          optionsCachedAt: Date.now(),
          escalation: result.options.escalation,
        });

        safeLog({
          activity: "options",
          ok: true,
          validated: true,
          cached: false,
          escalation: result.options.escalation,
          retrievedCount: result.retrievedCount,
          clauseCount: session.clauses.length,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          latencyMs: Date.now() - started,
        });

        return NextResponse.json(
          toOptionsResponse(
            token,
            (updated ?? session).title,
            result.options,
            false,
          ),
        );
      },
    });
  });
}
