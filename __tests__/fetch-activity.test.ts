import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchActivityOnce,
  sessionExpiredHomeHref,
} from "@/lib/client/fetch-activity";
import {
  AI_UNAVAILABLE_MESSAGE,
  RATE_LIMITED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/api/map-api-error";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchActivityOnce", () => {
  it("returns data on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: "t", cached: false }),
      }),
    );
    const result = await fetchActivityOnce<{ token: string }>(
      "/api/x",
      "fallback",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.token).toBe("t");
  });

  it("maps 503 to AI unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Set GROQ_API_KEY",
          },
        }),
      }),
    );
    const result = await fetchActivityOnce("/api/x", "fallback");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(AI_UNAVAILABLE_MESSAGE);
      expect(result.expired).toBe(false);
    }
  });

  it("maps 404 as expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: "NOT_FOUND", message: "gone" },
        }),
      }),
    );
    const result = await fetchActivityOnce("/api/x", "fallback");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(SESSION_EXPIRED_MESSAGE);
      expect(result.expired).toBe(true);
    }
  });

  it("auto-retries once on 429", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { code: "RATE_LIMITED", message: "slow" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchActivityOnce<{ ok: boolean }>("/api/x", "fallback");
    await vi.advanceTimersByTimeAsync(3_000);
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns rate-limit message when 429 persists", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { code: "RATE_LIMITED", message: "slow" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchActivityOnce("/api/x", "fallback");
    await vi.advanceTimersByTimeAsync(3_000);
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe(RATE_LIMITED_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips auto-retry when disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { code: "RATE_LIMITED", message: "slow" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchActivityOnce("/api/x", "fallback", {
      allowAutoRetry429: false,
    });
    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("posts JSON body when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchActivityOnce("/api/x", "fallback", {
      body: { locale: "hi" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/x",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ locale: "hi" }),
      }),
    );
  });

  it("uses fallback on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    const result = await fetchActivityOnce("/api/x", "Network failed");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Network failed");
      expect(result.status).toBe(0);
    }
  });

  it("rejects success bodies that fail the schema", async () => {
    const { z } = await import("zod");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: 123 }),
      }),
    );
    const result = await fetchActivityOnce<{ token: string }>(
      "/api/x",
      "Bad shape",
      { schema: z.object({ token: z.string() }) },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("Bad shape");
  });
});

describe("sessionExpiredHomeHref", () => {
  it("returns expired reason query", () => {
    expect(sessionExpiredHomeHref()).toBe("/?reason=expired");
  });
});
