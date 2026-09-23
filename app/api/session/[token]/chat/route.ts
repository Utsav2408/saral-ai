/**
 * POST /api/session/[token]/chat — grounded Q&A with citation validation.
 * Never logs document or chat content.
 */

import { NextResponse } from "next/server";
import { runChatTurn } from "@/lib/ai/chat";
import {
  clearChatLocks,
  releaseChatLock,
  tryAcquireChatLock,
} from "@/lib/ai/chat-lock";
import { jsonError } from "@/lib/api/errors";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import type { ChatResponse } from "@/types/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/** Exported for tests to reset in-process locks between cases. */
export { clearChatLocks };

/**
 * POST /api/session/[token]/chat
 */
export async function POST(
  request: Request,
  context: RouteContext,
): Promise<
  NextResponse<ChatResponse | { error: { code: string; message: string } }>
> {
  const started = Date.now();
  const { token } = await context.params;

  if (!sessionStore.isValidTokenFormat(token)) {
    safeLog({
      activity: "chat",
      ok: false,
      code: "INVALID_TOKEN",
      latencyMs: Date.now() - started,
    });
    return jsonError(400, "INVALID_TOKEN", "Invalid session token.");
  }

  const session = sessionStore.get(token);
  if (!session) {
    safeLog({
      activity: "chat",
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    safeLog({
      activity: "chat",
      ok: false,
      code: "EMPTY_MESSAGE",
      latencyMs: Date.now() - started,
    });
    return jsonError(400, "EMPTY_MESSAGE", "Please enter a question about your lease.");
  }

  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
      ? (body as { message: string }).message
      : "";

  const lock = tryAcquireChatLock(token);
  if (!lock.ok) {
    safeLog({
      activity: "chat",
      ok: false,
      code: "RATE_LIMITED",
      latencyMs: Date.now() - started,
    });
    return jsonError(
      429,
      "RATE_LIMITED",
      "Chat is already running or was just requested. Try again shortly.",
    );
  }

  try {
    const result = await runChatTurn({ session, message });

    if (!result.ok) {
      const status =
        result.code === "AI_NOT_CONFIGURED"
          ? 503
          : result.code === "RATE_LIMITED"
            ? 429
            : result.code === "EMPTY_MESSAGE" ||
                result.code === "MESSAGE_TOO_LONG"
              ? 400
              : result.code === "VALIDATION_FAILED" ||
                  result.code === "NO_RETRIEVAL"
                ? 422
                : 502;

      safeLog({
        activity: "chat",
        ok: false,
        code: result.code,
        validated: false,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        latencyMs: Date.now() - started,
      });

      return jsonError(status, result.code, result.message);
    }

    const updated = sessionStore.update(token, {
      messages: result.messages,
    });

    safeLog({
      activity: "chat",
      ok: true,
      validated: true,
      retrievedCount: result.retrievedCount,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      latencyMs: Date.now() - started,
    });

    const response: ChatResponse = {
      token,
      title: (updated ?? session).title,
      reply: result.reply,
      messages: result.messages,
      regime: {
        state: result.regime.state,
        category: result.regime.category,
        code: result.regime.code,
        label: result.regime.label,
      },
    };

    return NextResponse.json(response);
  } finally {
    releaseChatLock(token);
  }
}
