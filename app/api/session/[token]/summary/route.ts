/**
 * POST /api/session/[token]/summary — facts + flags → one LLM → checklist.
 * Caches successful results on the session. Never logs document content.
 */

import { runSummary, type RunSummaryResult } from "@/lib/ai/summary";
import { getCachedActivity } from "@/lib/activities/registry";
import { handleCachedActivityRequest } from "@/lib/api/cached-activity";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { sessionStore } from "@/lib/session/store";
import type { SummaryResponse, SummaryResult } from "@/types/session";

export const runtime = "nodejs";

const activity = getCachedActivity("summary");

/** Exported for tests to reset in-process locks between cases. */
export const clearSummaryLocks = activity.lock.clear;

type SummarySuccess = Extract<RunSummaryResult, { ok: true }>;

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
) {
  return handleCachedActivityRequest<SummaryResponse, SummarySuccess>(
    context,
    {
      activity: activity.id,
      lock: activity.lock,
      rateLimitMessage: activity.rateLimitMessage,
      readCache: (session) => {
        if (!session.summary) return null;
        return toSummaryResponse(
          session.token,
          session.title,
          session.summary,
          session.facts,
          true,
        );
      },
      cacheLog: (session) => ({
        flagCount: session.summary?.flags.length,
        checklistCount: session.summary?.checklist.length,
      }),
      run: async (session) => runSummary({ session }),
      onSuccess: (token, session, result) => {
        const updated = sessionStore.update(token, {
          summary: result.summary,
          summaryCachedAt: Date.now(),
        });
        return {
          response: toSummaryResponse(
            token,
            (updated ?? session).title,
            result.summary,
            (updated ?? session).facts,
            false,
          ),
          log: {
            flagCount: result.summary.flags.length,
            checklistCount: result.summary.checklist.length,
          },
        };
      },
    },
  );
}
