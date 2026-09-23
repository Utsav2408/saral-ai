/**
 * POST /api/session/[token]/options — escalation → RERA → retrieval → one LLM.
 * Caches successful results. Never logs document content or matched escalation terms.
 */

import { NextResponse } from "next/server";
import {
  clearOptionsLocks,
  releaseOptionsLock,
  tryAcquireOptionsLock,
} from "@/lib/ai/options-lock";
import { runOptions } from "@/lib/ai/options";
import { jsonError } from "@/lib/api/errors";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { OptionsResponse, OptionsResult } from "@/types/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/** Exported for tests to reset in-process locks between cases. */
export { clearOptionsLocks };

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
  context: RouteContext,
): Promise<
  NextResponse<OptionsResponse | { error: { code: string; message: string } }>
> {
  const started = Date.now();
  const { token } = await context.params;

  if (!sessionStore.isValidTokenFormat(token)) {
    safeLog({
      activity: "options",
      ok: false,
      code: "INVALID_TOKEN",
      latencyMs: Date.now() - started,
    });
    return jsonError(400, "INVALID_TOKEN", "Invalid session token.");
  }

  const session = sessionStore.get(token);
  if (!session) {
    safeLog({
      activity: "options",
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

  const lock = tryAcquireOptionsLock(token);
  if (!lock.ok) {
    safeLog({
      activity: "options",
      ok: false,
      code: "RATE_LIMITED",
      clauseCount: session.clauses.length,
      latencyMs: Date.now() - started,
    });
    return jsonError(
      429,
      "RATE_LIMITED",
      "Options is already running or was just requested. Try again shortly.",
    );
  }

  try {
    const result = await runOptions({ session });

    // Persist sticky escalation even on failure when the guard ran.
    if (result.ok === false && result.escalation) {
      sessionStore.update(token, { escalation: true });
    }

    if (!result.ok) {
      const status =
        result.code === "AI_NOT_CONFIGURED"
          ? 503
          : result.code === "RATE_LIMITED"
            ? 429
            : result.code === "NO_CLAUSES" ||
                result.code === "VALIDATION_FAILED" ||
                result.code === "NO_RETRIEVAL"
              ? 422
              : 502;

      safeLog({
        activity: "options",
        ok: false,
        code: result.code,
        validated: false,
        cached: false,
        escalation: result.escalation ?? session.escalation,
        clauseCount: session.clauses.length,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        latencyMs: Date.now() - started,
      });

      return jsonError(status, result.code, result.message);
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
  } finally {
    releaseOptionsLock(token);
  }
}
