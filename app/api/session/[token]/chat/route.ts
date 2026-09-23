/**
 * POST /api/session/[token]/chat — grounded Q&A with citation validation.
 * Never logs document or chat content.
 */

import { NextResponse } from "next/server";
import { runChatTurn } from "@/lib/ai/chat";
import { chatLock } from "@/lib/ai/token-lock";
import {
  activityFailureResponse,
  handleActivityRequest,
  rateLimitedResponse,
} from "@/lib/api/activity-route";
import type { SessionRouteContext } from "@/lib/api/require-session";
import { withTokenLock } from "@/lib/api/with-token-lock";
import { MAX_CHAT_MESSAGE_CHARS } from "@/lib/constants";
import { safeLog } from "@/lib/logging/safe-log";
import { sessionStore } from "@/lib/session/store";
import { toRegimeDto } from "@/lib/tools/state-law-status";
import type { ChatResponse } from "@/types/session";

export const runtime = "nodejs";

/** Exported for tests to reset in-process locks between cases. */
export const clearChatLocks = chatLock.clear;

const EMPTY_MESSAGE = "Please enter a question about your lease.";
const MESSAGE_TOO_LONG =
  "That question is too long. Please shorten it.";

/** Pull a trimmed message string from a JSON body, or null if absent. */
function readMessage(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return null;
}

/**
 * POST /api/session/[token]/chat
 */
export async function POST(
  request: Request,
  context: SessionRouteContext,
): Promise<
  NextResponse<ChatResponse | { error: { code: string; message: string } }>
> {
  return handleActivityRequest("chat", context, async ({ token, session, started }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return activityFailureResponse(
        "chat",
        started,
        "EMPTY_MESSAGE",
        EMPTY_MESSAGE,
      );
    }

    const raw = readMessage(body);
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) {
      return activityFailureResponse(
        "chat",
        started,
        "EMPTY_MESSAGE",
        EMPTY_MESSAGE,
      );
    }
    if (trimmed.length > MAX_CHAT_MESSAGE_CHARS) {
      return activityFailureResponse(
        "chat",
        started,
        "MESSAGE_TOO_LONG",
        MESSAGE_TOO_LONG,
      );
    }

    return withTokenLock({
      tryAcquire: chatLock.tryAcquire,
      release: chatLock.release,
      token,
      blocked: () =>
        rateLimitedResponse(
          "chat",
          started,
          "Chat is already running or was just requested. Try again shortly.",
        ),
      work: async () => {
        const result = await runChatTurn({ session, message: trimmed });

        if (!result.ok) {
          return activityFailureResponse(
            "chat",
            started,
            result.code,
            result.message,
            { usage: result.usage },
          );
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
          regime: toRegimeDto(result.regime),
        };

        return NextResponse.json(response);
      },
    });
  });
}
