/**
 * Shared shell for GenAI activity POST handlers:
 * session gate → work → INTERNAL catch.
 */

import type { NextResponse } from "next/server";
import type { LlmUsage } from "@/lib/ai/llm-shared";
import { httpStatusForActivityCode } from "@/lib/api/activity-status";
import { jsonError } from "@/lib/api/errors";
import { INTERNAL_ERROR_MESSAGE } from "@/lib/api/map-api-error";
import {
  requireSession,
  type SessionRouteContext,
} from "@/lib/api/require-session";
import { safeLog, type ClarityActivity } from "@/lib/logging/safe-log";
import type { ApiErrorBody, Session } from "@/types/session";

export type ActivityHandlerContext = {
  token: string;
  session: Session;
  started: number;
};

/**
 * Resolve the session, run `handler`, and map unexpected throws to INTERNAL.
 */
export async function handleActivityRequest<T>(
  activity: ClarityActivity,
  context: SessionRouteContext,
  handler: (
    ctx: ActivityHandlerContext,
  ) => Promise<NextResponse<T | ApiErrorBody>>,
): Promise<NextResponse<T | ApiErrorBody>> {
  const started = Date.now();
  try {
    const { token: rawToken } = await context.params;
    const gate = requireSession(rawToken, activity, started);
    if (!gate.ok) return gate.response;
    return await handler({
      token: gate.token,
      session: gate.session,
      started,
    });
  } catch {
    safeLog({
      activity,
      ok: false,
      code: "INTERNAL",
      latencyMs: Date.now() - started,
    });
    return jsonError(500, "INTERNAL", INTERNAL_ERROR_MESSAGE);
  }
}

/**
 * Build the standard in-flight / cooldown 429 response for an activity.
 */
export function rateLimitedResponse(
  activity: ClarityActivity,
  started: number,
  message: string,
  extras?: { clauseCount?: number },
): NextResponse<ApiErrorBody> {
  safeLog({
    activity,
    ok: false,
    code: "RATE_LIMITED",
    clauseCount: extras?.clauseCount,
    latencyMs: Date.now() - started,
  });
  return jsonError(429, "RATE_LIMITED", message);
}

type ActivityFailureExtras = {
  clauseCount?: number;
  inventedCount?: number;
  escalation?: boolean;
  usage?: LlmUsage;
};

/**
 * Log a failed activity result and return the matching HTTP error.
 */
export function activityFailureResponse(
  activity: ClarityActivity,
  started: number,
  code: string,
  message: string,
  extras?: ActivityFailureExtras,
): NextResponse<ApiErrorBody> {
  safeLog({
    activity,
    ok: false,
    code,
    validated: false,
    cached: false,
    clauseCount: extras?.clauseCount,
    inventedCount: extras?.inventedCount,
    escalation: extras?.escalation,
    promptTokens: extras?.usage?.promptTokens,
    completionTokens: extras?.usage?.completionTokens,
    latencyMs: Date.now() - started,
  });
  return jsonError(httpStatusForActivityCode(code), code, message);
}
