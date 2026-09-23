/**
 * POST /api/session/[token]/simplify — one LLM call for all clauses.
 * Caches successful results on the session (keyed by locale). Never logs document content.
 */

import { runSimplify, type RunSimplifyResult } from "@/lib/ai/simplify";
import { getCachedActivity } from "@/lib/activities/registry";
import { handleCachedActivityRequest } from "@/lib/api/cached-activity";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { DEFAULT_LOCALE, localeFromBody } from "@/lib/i18n/locale";
import { sessionStore } from "@/lib/session/store";
import type { SimplifyResponse } from "@/types/session";

export const runtime = "nodejs";

const activity = getCachedActivity("simplify");

/** Exported for tests to reset in-process locks between cases. */
export const clearSimplifyLocks = activity.lock.clear;

type SimplifySuccess = Extract<RunSimplifyResult, { ok: true }>;

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
 * Optional JSON body: `{ "locale": "en" | "hi" }`.
 */
export async function POST(
  request: Request,
  context: SessionRouteContext,
) {
  let locale = DEFAULT_LOCALE;
  try {
    const body: unknown = await request.json();
    locale = localeFromBody(body);
  } catch {
    /* empty / non-JSON body → English */
  }

  return handleCachedActivityRequest<SimplifyResponse, SimplifySuccess>(
    context,
    {
      activity: activity.id,
      lock: activity.lock,
      rateLimitMessage: activity.rateLimitMessage,
      readCache: (session) => {
        if (
          !session.simplifiedClauses ||
          session.simplifiedClauses.length === 0
        ) {
          return null;
        }
        const cachedLocale = session.simplifyLocale ?? DEFAULT_LOCALE;
        if (cachedLocale !== locale) {
          return null;
        }
        return toSimplifyResponse(
          session.token,
          session.title,
          session.clauses,
          session.simplifiedClauses,
          true,
        );
      },
      run: async (session) =>
        runSimplify({ clauses: session.clauses, locale }),
      onSuccess: (token, session, result) => {
        const updated = sessionStore.update(token, {
          simplifiedClauses: result.simplified,
          simplifyCachedAt: Date.now(),
          simplifyLocale: locale,
        });
        return {
          response: toSimplifyResponse(
            token,
            (updated ?? session).title,
            (updated ?? session).clauses,
            result.simplified,
            false,
          ),
        };
      },
    },
  );
}
