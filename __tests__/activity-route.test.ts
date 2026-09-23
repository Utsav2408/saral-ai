/**
 * Shared activity route shell — session gate + INTERNAL catch.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activityFailureResponse,
  handleActivityRequest,
  rateLimitedResponse,
} from "@/lib/api/activity-route";
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

describe("handleActivityRequest", () => {
  it("returns NOT_FOUND for unknown tokens", async () => {
    const res = await handleActivityRequest(
      "simplify",
      { params: Promise.resolve({ token: "a".repeat(43) }) },
      async () => {
        throw new Error("should not run");
      },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("passes token + session to the handler", async () => {
    const token = seedSession();
    const res = await handleActivityRequest(
      "summary",
      { params: Promise.resolve({ token }) },
      async ({ token: t, session }) => {
        expect(t).toBe(token);
        expect(session.title).toBe("Lease");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as never;
      },
    );
    expect(res.status).toBe(200);
  });

  it("maps unexpected throws to INTERNAL", async () => {
    const token = seedSession();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await handleActivityRequest(
      "chat",
      { params: Promise.resolve({ token }) },
      async () => {
        throw new Error("boom");
      },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
    spy.mockRestore();
  });
});

describe("rateLimitedResponse", () => {
  it("returns 429 RATE_LIMITED", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = rateLimitedResponse("options", Date.now(), "slow down", {
      clauseCount: 2,
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    spy.mockRestore();
  });
});

describe("activityFailureResponse", () => {
  it("maps validation codes to 422", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = activityFailureResponse(
      "simplify",
      Date.now(),
      "ID_MISMATCH",
      "Could not simplify this document.",
      { clauseCount: 3 },
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("ID_MISMATCH");
    spy.mockRestore();
  });
});
