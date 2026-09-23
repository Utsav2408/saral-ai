import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadPOST } from "@/app/api/upload/route";
import {
  clearSummaryLocks,
  POST as summaryPOST,
} from "@/app/api/session/[token]/summary/route";
import { sessionStore } from "@/lib/session/store";

vi.mock("@/lib/ai/summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/summary")>();
  return {
    ...actual,
    runSummary: vi.fn(),
  };
});

import { runSummary } from "@/lib/ai/summary";

const runSummaryMock = vi.mocked(runSummary);

afterEach(() => {
  sessionStore.clear();
  clearSummaryLocks();
  runSummaryMock.mockReset();
  vi.restoreAllMocks();
});

beforeEach(() => {
  clearSummaryLocks();
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

function summaryRequest(token: string) {
  return summaryPOST(
    new Request(`http://localhost/api/session/${token}/summary`, {
      method: "POST",
    }),
    { params: Promise.resolve({ token }) },
  );
}

describe("POST /api/session/[token]/summary", () => {
  it("returns 400 for invalid token", async () => {
    const res = await summaryPOST(
      new Request("http://localhost/api/session/bad/summary", {
        method: "POST",
      }),
      { params: Promise.resolve({ token: "bad" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown token", async () => {
    const res = await summaryRequest("a".repeat(43));
    expect(res.status).toBe(404);
  });

  it("returns 503 when AI not configured", async () => {
    const token = await uploadSample();
    runSummaryMock.mockResolvedValue({
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "AI is not configured. Set GROQ_API_KEY on the server.",
    });
    const res = await summaryRequest(token);
    expect(res.status).toBe(503);
  });

  it("happy path caches and second call is cached", async () => {
    const token = await uploadSample();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runSummaryMock.mockResolvedValue({
      ok: true,
      summary: {
        flags: [
          {
            id: "flag-missing_receipt",
            ruleId: "missing_receipt",
            severity: "info",
            summaryKey: "gap.missing_receipt",
          },
        ],
        flagDescriptions: [
          {
            flagId: "flag-missing_receipt",
            description: "No receipt clause.",
          },
        ],
        checklist: [
          {
            id: "check-1",
            text: "Ask for receipts.",
            priority: "medium",
          },
        ],
        overview: "Short overview.",
      },
      usage: { promptTokens: 1, completionTokens: 2 },
      retried: false,
    });

    const first = await summaryRequest(token);
    expect(first.status).toBe(200);
    const body1 = await first.json();
    expect(body1.cached).toBe(false);
    expect(body1.overview).toBe("Short overview.");

    const second = await summaryRequest(token);
    expect(second.status).toBe(200);
    const body2 = await second.json();
    expect(body2.cached).toBe(true);
    expect(runSummaryMock).toHaveBeenCalledTimes(1);

    const logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).not.toContain("Ask for receipts");
    expect(logged).not.toContain("No receipt clause");
  });

  it("returns 429 when lock held", async () => {
    const token = await uploadSample();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    runSummaryMock.mockImplementation(async () => {
      await gate;
      return {
        ok: true,
        summary: {
          flags: [],
          flagDescriptions: [],
          checklist: [],
          overview: "ok",
        },
        usage: {},
        retried: false,
      };
    });

    const firstPromise = summaryRequest(token);
    await new Promise((r) => setTimeout(r, 20));
    const second = await summaryRequest(token);
    expect(second.status).toBe(429);
    release();
    await firstPromise;
  });
});
