/**
 * Cached activity route helper — cache hit, lock, failure, success.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createTokenLock } from "@/lib/ai/token-lock";
import { handleCachedActivityRequest } from "@/lib/api/cached-activity";
import { sessionStore } from "@/lib/session/store";

afterEach(() => {
  sessionStore.clear();
});

function seedSession(): string {
  return sessionStore.create({
    title: "Lease",
    sourceFilename: "lease.txt",
    mimeType: "text/plain",
    rawTextLength: 12,
    clauses: [{ id: "c-1", index: 1, text: "Rent is due." }],
    facts: {},
  }).token;
}

describe("handleCachedActivityRequest", () => {
  it("serves cache hits without calling run", async () => {
    const token = seedSession();
    sessionStore.update(token, {
      simplifiedClauses: [
        { clauseId: "c-1", simpleText: "Pay rent.", entityCheckPassed: true },
      ],
      simplifyCachedAt: Date.now(),
    });
    const run = vi.fn();
    const lock = createTokenLock(0);

    const res = await handleCachedActivityRequest(
      { params: Promise.resolve({ token }) },
      {
        activity: "simplify",
        lock,
        rateLimitMessage: "busy",
        readCache: (session) =>
          session.simplifiedClauses
            ? { cached: true, n: session.simplifiedClauses.length }
            : null,
        run,
        onSuccess: () => ({ response: { cached: false } }),
      },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cached: true, n: 1 });
    expect(run).not.toHaveBeenCalled();
  });

  it("persists success and returns JSON", async () => {
    const token = seedSession();
    const lock = createTokenLock(0);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await handleCachedActivityRequest(
      { params: Promise.resolve({ token }) },
      {
        activity: "simplify",
        lock,
        rateLimitMessage: "busy",
        readCache: () => null,
        run: async () => ({
          ok: true as const,
          usage: { promptTokens: 1, completionTokens: 2 },
          value: "ok",
        }),
        onSuccess: (t, _session, result) => {
          sessionStore.update(t, {
            simplifiedClauses: [
              {
                clauseId: "c-1",
                simpleText: result.value,
                entityCheckPassed: true,
              },
            ],
            simplifyCachedAt: Date.now(),
          });
          return { response: { value: result.value, cached: false } };
        },
      },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ value: "ok", cached: false });
    expect(sessionStore.get(token)?.simplifiedClauses?.[0]?.simpleText).toBe(
      "ok",
    );
    spy.mockRestore();
  });

  it("maps failures and invokes onFailure", async () => {
    const token = seedSession();
    const lock = createTokenLock(0);
    const onFailure = vi.fn();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await handleCachedActivityRequest(
      { params: Promise.resolve({ token }) },
      {
        activity: "options",
        lock,
        rateLimitMessage: "busy",
        readCache: () => null,
        run: async () => ({
          ok: false as const,
          code: "OPTIONS_FAILED",
          message: "nope",
          escalation: true,
        }),
        onFailure,
        onSuccess: () => ({ response: {} }),
      },
    );

    expect(res.status).toBe(502);
    expect(onFailure).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("returns 429 when lock is held", async () => {
    const token = seedSession();
    const lock = createTokenLock(60_000);
    expect(lock.tryAcquire(token).ok).toBe(true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await handleCachedActivityRequest(
      { params: Promise.resolve({ token }) },
      {
        activity: "summary",
        lock,
        rateLimitMessage: "busy",
        readCache: () => null,
        run: async () => {
          throw new Error("should not run");
        },
        onSuccess: () => ({ response: {} }),
      },
    );

    expect(res.status).toBe(429);
    lock.release(token);
    spy.mockRestore();
  });
});
