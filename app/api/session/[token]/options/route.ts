/**
 * POST /api/session/[token]/options — escalation → RERA → retrieval → one LLM.
 * Caches successful results. Never logs document content or matched escalation terms.
 */

import { runOptions, type RunOptionsResult } from "@/lib/ai/options";
import { getCachedActivity } from "@/lib/activities/registry";
import { handleCachedActivityRequest } from "@/lib/api/cached-activity";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { sessionStore } from "@/lib/session/store";
import type { OptionsResponse, OptionsResult } from "@/types/session";

export const runtime = "nodejs";

const activity = getCachedActivity("options");

/** Exported for tests to reset in-process locks between cases. */
export const clearOptionsLocks = activity.lock.clear;

type OptionsSuccess = Extract<RunOptionsResult, { ok: true }>;

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
) {
  return handleCachedActivityRequest<OptionsResponse, OptionsSuccess>(
    context,
    {
      activity: activity.id,
      lock: activity.lock,
      rateLimitMessage: activity.rateLimitMessage,
      readCache: (session) => {
        if (!session.options) return null;
        return toOptionsResponse(
          session.token,
          session.title,
          session.options,
          true,
        );
      },
      cacheLog: (session) => ({
        escalation: session.options?.escalation,
      }),
      run: async (session) => runOptions({ session }),
      onFailure: (token, _session, failure) => {
        if (failure.escalation) {
          sessionStore.update(token, { escalation: true });
        }
      },
      onSuccess: (token, session, result) => {
        const updated = sessionStore.update(token, {
          options: result.options,
          optionsCachedAt: Date.now(),
          escalation: result.options.escalation,
        });
        return {
          response: toOptionsResponse(
            token,
            (updated ?? session).title,
            result.options,
            false,
          ),
          log: {
            escalation: result.options.escalation,
            retrievedCount: result.retrievedCount,
          },
        };
      },
    },
  );
}
