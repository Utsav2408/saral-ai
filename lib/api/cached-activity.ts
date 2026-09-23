/**
 * Shared POST handler for cached GenAI activities (Simplify / Summary / Options):
 * session gate → cache hit → lock → run → persist → JSON.
 */

import { NextResponse } from "next/server";
import type { LlmUsage } from "@/lib/ai/llm-shared";
import type { TokenLock } from "@/lib/ai/token-lock";
import {
  activityFailureResponse,
  handleActivityRequest,
  rateLimitedResponse,
} from "@/lib/api/activity-route";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { withTokenLock } from "@/lib/api/with-token-lock";
import type { ClarityActivity } from "@/lib/activities/registry";
import { safeLog, type SafeLogFields } from "@/lib/logging/safe-log";
import type { ApiErrorBody, Session } from "@/types/session";

export type CachedActivityFailure = {
  ok: false;
  code: string;
  message: string;
  usage?: LlmUsage;
  inventedCount?: number;
  escalation?: boolean;
};

export type CachedActivitySuccessBase = {
  ok: true;
  usage: LlmUsage;
};

export type HandleCachedActivityConfig<
  TResponse,
  TSuccess extends CachedActivitySuccessBase,
> = {
  activity: ClarityActivity;
  lock: TokenLock;
  rateLimitMessage: string;
  /** Return response body on cache hit, or null on miss. */
  readCache: (session: Session) => TResponse | null;
  /** Extra log fields on cache hit (clauseCount is always included). */
  cacheLog?: (session: Session) => Partial<SafeLogFields>;
  run: (session: Session) => Promise<TSuccess | CachedActivityFailure>;
  /** Side effects on failure (e.g. sticky escalation). */
  onFailure?: (
    token: string,
    session: Session,
    failure: CachedActivityFailure,
  ) => void;
  /** Persist + build success response / log extras. */
  onSuccess: (
    token: string,
    session: Session,
    result: TSuccess,
  ) => {
    response: TResponse;
    log?: Partial<SafeLogFields>;
  };
};

/**
 * Run a cached activity route with shared lock / failure / success logging.
 */
export function handleCachedActivityRequest<
  TResponse,
  TSuccess extends CachedActivitySuccessBase,
>(
  context: SessionRouteContext,
  config: HandleCachedActivityConfig<TResponse, TSuccess>,
): Promise<NextResponse<TResponse | ApiErrorBody>> {
  const {
    activity,
    lock,
    rateLimitMessage,
    readCache,
    cacheLog,
    run,
    onFailure,
    onSuccess,
  } = config;

  return handleActivityRequest(
    activity,
    context,
    async ({ token, session, started }) => {
      const cached = readCache(session);
      if (cached !== null) {
        safeLog({
          activity,
          ok: true,
          cached: true,
          validated: true,
          clauseCount: session.clauses.length,
          latencyMs: Date.now() - started,
          ...cacheLog?.(session),
        });
        return NextResponse.json(cached);
      }

      return withTokenLock({
        tryAcquire: lock.tryAcquire,
        release: lock.release,
        token,
        blocked: () =>
          rateLimitedResponse(activity, started, rateLimitMessage, {
            clauseCount: session.clauses.length,
          }),
        work: async () => {
          const result = await run(session);

          if (!result.ok) {
            onFailure?.(token, session, result);
            return activityFailureResponse(
              activity,
              started,
              result.code,
              result.message,
              {
                clauseCount: session.clauses.length,
                inventedCount: result.inventedCount,
                escalation: result.escalation ?? session.escalation,
                usage: result.usage,
              },
            );
          }

          const { response, log } = onSuccess(token, session, result);
          safeLog({
            activity,
            ok: true,
            validated: true,
            cached: false,
            clauseCount: session.clauses.length,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            latencyMs: Date.now() - started,
            ...log,
          });
          return NextResponse.json(response);
        },
      });
    },
  );
}
