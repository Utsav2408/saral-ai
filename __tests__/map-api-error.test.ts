import { describe, expect, it } from "vitest";
import {
  AI_UNAVAILABLE_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  mapApiError,
  mapApiErrorFromBody,
  RATE_LIMITED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/api/map-api-error";

describe("mapApiError", () => {
  it("maps AI_NOT_CONFIGURED and 503 to user-safe copy", () => {
    expect(mapApiError("AI_NOT_CONFIGURED", 503)).toBe(AI_UNAVAILABLE_MESSAGE);
    expect(mapApiError(undefined, 503)).toBe(AI_UNAVAILABLE_MESSAGE);
    expect(
      mapApiError(
        "AI_NOT_CONFIGURED",
        503,
        "AI is not configured. Set GROQ_API_KEY on the server.",
      ),
    ).toBe(AI_UNAVAILABLE_MESSAGE);
    expect(AI_UNAVAILABLE_MESSAGE).not.toMatch(/GROQ_API_KEY/);
  });

  it("maps RATE_LIMITED and 429", () => {
    expect(mapApiError("RATE_LIMITED", 429)).toBe(RATE_LIMITED_MESSAGE);
    expect(mapApiError(undefined, 429)).toBe(RATE_LIMITED_MESSAGE);
  });

  it("maps NOT_FOUND and 404", () => {
    expect(mapApiError("NOT_FOUND", 404)).toBe(SESSION_EXPIRED_MESSAGE);
    expect(mapApiError(undefined, 404)).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it("maps INTERNAL and 5xx", () => {
    expect(mapApiError("INTERNAL", 500)).toBe(INTERNAL_ERROR_MESSAGE);
    expect(mapApiError(undefined, 502)).toBe(INTERNAL_ERROR_MESSAGE);
  });

  it("passes through safe server messages for 4xx", () => {
    expect(
      mapApiError("EMPTY_MESSAGE", 400, "Please enter a question about your lease."),
    ).toBe("Please enter a question about your lease.");
  });

  it("strips ops hints from server messages", () => {
    expect(
      mapApiError("X", 400, "Set GROQ_API_KEY on the server."),
    ).toBe(INTERNAL_ERROR_MESSAGE);
  });
});

describe("mapApiErrorFromBody", () => {
  it("reads code and message from API error body", () => {
    expect(
      mapApiErrorFromBody(429, {
        error: { code: "RATE_LIMITED", message: "ignored for 429" },
      }),
    ).toBe(RATE_LIMITED_MESSAGE);
  });

  it("uses fallback when body is empty", () => {
    expect(mapApiErrorFromBody(0, null, "Network failed")).toBe(
      "Network failed",
    );
  });

  it("ignores non-string code/message fields", () => {
    expect(
      mapApiErrorFromBody(400, {
        error: { code: 123, message: { nested: true } },
      }, "fallback"),
    ).toBe("fallback");
  });

  it("maps INTERNAL code even with a server message", () => {
    expect(
      mapApiError("INTERNAL", 400, "should not leak"),
    ).toBe(INTERNAL_ERROR_MESSAGE);
  });
});
