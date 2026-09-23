import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadPOST } from "@/app/api/upload/route";
import {
  clearSimplifyLocks,
  POST as simplifyPOST,
} from "@/app/api/session/[token]/simplify/route";
import { sessionStore } from "@/lib/session/store";

vi.mock("@/lib/ai/simplify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/simplify")>();
  return {
    ...actual,
    runSimplify: vi.fn(),
  };
});

import { runSimplify } from "@/lib/ai/simplify";

const runSimplifyMock = vi.mocked(runSimplify);

afterEach(() => {
  sessionStore.clear();
  clearSimplifyLocks();
  runSimplifyMock.mockReset();
  vi.restoreAllMocks();
});

beforeEach(() => {
  clearSimplifyLocks();
});

async function uploadSample(): Promise<string> {
  const text = readFileSync(
    join(process.cwd(), "fixtures/leases/sample-lease.txt"),
  );
  const file = new File([text], "sample-lease.txt", { type: "text/plain" });
  const form = new FormData();
  form.append("file", file);
  const res = await uploadPOST(
    new Request("http://localhost/api/upload", {
      method: "POST",
      body: form,
    }),
  );
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.token as string;
}

describe("POST /api/session/[token]/simplify", () => {
  it("returns 400 for invalid token", async () => {
    const res = await simplifyPOST(
      new Request("http://localhost/api/session/bad/simplify", {
        method: "POST",
      }),
      { params: Promise.resolve({ token: "bad" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 404 for unknown token", async () => {
    const token = "a".repeat(43);
    const res = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 503 when AI is not configured", async () => {
    const token = await uploadSample();
    runSimplifyMock.mockResolvedValue({
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "AI is not configured. Set GROQ_API_KEY on the server.",
    });

    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((line: string) => {
      logs.push(String(line));
    });

    const res = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("AI_NOT_CONFIGURED");

    const joined = logs.join("\n");
    expect(joined).not.toMatch(/1,50,000|security deposit|Tenant shall/i);
    spy.mockRestore();
  });

  it("simplifies, caches, and serves cache on second call", async () => {
    const token = await uploadSample();
    const session = sessionStore.get(token)!;
    const simplified = session.clauses.map((c) => ({
      clauseId: c.id,
      simpleText: `Plain: ${c.text.slice(0, 40)}`,
      entityCheckPassed: true,
    }));

    runSimplifyMock.mockResolvedValue({
      ok: true,
      simplified,
      usage: { promptTokens: 12, completionTokens: 34 },
      retried: false,
    });

    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((line: string) => {
      logs.push(String(line));
    });

    const first = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.cached).toBe(false);
    expect(firstBody.simplifiedClauses).toHaveLength(session.clauses.length);
    expect(runSimplifyMock).toHaveBeenCalledTimes(1);

    // Clear cooldown so a second request is allowed; cache should short-circuit
    clearSimplifyLocks();

    const second = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.cached).toBe(true);
    expect(runSimplifyMock).toHaveBeenCalledTimes(1);

    const joined = logs.join("\n");
    expect(joined).not.toMatch(/1,50,000|security deposit|Tenant shall/i);
    expect(joined).toMatch(/"activity":"simplify"/);
    spy.mockRestore();
  });

  it("maps ENTITY_CHECK_FAILED to 422", async () => {
    const token = await uploadSample();
    runSimplifyMock.mockResolvedValue({
      ok: false,
      code: "ENTITY_CHECK_FAILED",
      message: "The plain-language version failed a safety check.",
      inventedCount: 2,
    });

    const res = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("ENTITY_CHECK_FAILED");
  });

  it("maps provider RATE_LIMITED to 429", async () => {
    const token = await uploadSample();
    runSimplifyMock.mockResolvedValue({
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Try again shortly.",
    });

    const res = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(res.status).toBe(429);
  });

  it("returns 429 when a simplify is already in flight", async () => {
    const token = await uploadSample();
    let resolveSimplify!: (value: unknown) => void;
    runSimplifyMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSimplify = resolve;
        }) as never,
    );

    const firstPromise = simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );

    // Allow the first request to acquire the lock
    await Promise.resolve();
    await Promise.resolve();

    const second = await simplifyPOST(
      new Request(`http://localhost/api/session/${token}/simplify`, {
        method: "POST",
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(second.status).toBe(429);

    resolveSimplify({
      ok: true,
      simplified: [],
      usage: {},
      retried: false,
    });
    await firstPromise;
  });
});
