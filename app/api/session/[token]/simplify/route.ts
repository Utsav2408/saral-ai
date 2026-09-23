/**
 * POST /api/session/[token]/simplify — one LLM call for all clauses.
 * Caches successful results on the session. Never logs document content.
 */

import { NextResponse } from "next/server";
import {
  clearSimplifyLocks,
  releaseSimplifyLock,
  tryAcquireSimplifyLock,
} from "@/lib/ai/simplify-lock";
import { runSimplify } from "@/lib/ai/simplify";
import { jsonError } from "@/lib/api/errors";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { SimplifyResponse } from "@/types/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/** Exported for tests to reset in-process locks between cases. */
export { clearSimplifyLocks };

/**
 * Build the public simplify DTO.
 */
function toSimplifyResponse(
  token: string,
  title: string,
  clauses: SimplifyResponse["clauses"],
  simplifiedClauses: SimplifyResponse["simplifiedClauses"],
  cached: boolean,
): SimplifyResponse {
  return {
    token,
    title,
    clauses,
    simplifiedClauses,
    cached,
  };
}

/**
 * POST /api/session/[token]/simplify
 */
export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<
  NextResponse<SimplifyResponse | { error: { code: string; message: string } }>
> {
  const started = Date.now();
  const { token } = await context.params;

  if (!sessionStore.isValidTokenFormat(token)) {
    safeLog({
      activity: "simplify",
      ok: false,
      code: "INVALID_TOKEN",
      latencyMs: Date.now() - started,
    });
    return jsonError(400, "INVALID_TOKEN", "Invalid session token.");
  }

  const session = sessionStore.get(token);
  if (!session) {
    safeLog({
      activity: "simplify",
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

  // Cache hit — no Groq call, no lock needed
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

  const lock = tryAcquireSimplifyLock(token);
  if (!lock.ok) {
    safeLog({
      activity: "simplify",
      ok: false,
      code: "RATE_LIMITED",
      clauseCount: session.clauses.length,
      latencyMs: Date.now() - started,
    });
    return jsonError(
      429,
      "RATE_LIMITED",
      "Simplify is already running or was just requested. Try again shortly.",
    );
  }

  try {
    const result = await runSimplify({ clauses: session.clauses });

    if (!result.ok) {
      const status =
        result.code === "AI_NOT_CONFIGURED"
          ? 503
          : result.code === "RATE_LIMITED"
            ? 429
            : result.code === "ENTITY_CHECK_FAILED" ||
                result.code === "NO_CLAUSES" ||
                result.code === "TOO_MANY_CLAUSES"
              ? 422
              : 502;

      safeLog({
        activity: "simplify",
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
  } finally {
    releaseSimplifyLock(token);
  }
}
