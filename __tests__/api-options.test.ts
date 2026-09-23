import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadPOST } from "@/app/api/upload/route";
import {
  clearOptionsLocks,
  POST as optionsPOST,
} from "@/app/api/session/[token]/options/route";
import { sessionStore } from "@/lib/session/store";

vi.mock("@/lib/ai/options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/options")>();
  return {
    ...actual,
    runOptions: vi.fn(),
  };
});

import { runOptions } from "@/lib/ai/options";

const runOptionsMock = vi.mocked(runOptions);

afterEach(() => {
  sessionStore.clear();
  clearOptionsLocks();
  runOptionsMock.mockReset();
  vi.restoreAllMocks();
});

beforeEach(() => {
  clearOptionsLocks();
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

function optionsRequest(token: string) {
  return optionsPOST(
    new Request(`http://localhost/api/session/${token}/options`, {
      method: "POST",
    }),
    { params: Promise.resolve({ token }) },
  );
}

describe("POST /api/session/[token]/options", () => {
  it("returns 400 for invalid token", async () => {
    const res = await optionsPOST(
      new Request("http://localhost/api/session/bad/options", {
        method: "POST",
      }),
      { params: Promise.resolve({ token: "bad" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown token", async () => {
    const res = await optionsRequest("a".repeat(43));
    expect(res.status).toBe(404);
  });

  it("happy path stores escalation and caches", async () => {
    const token = await uploadSample();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runOptionsMock.mockResolvedValue({
      ok: true,
      options: {
        escalation: true,
        reraChecks: [
          {
            disputeType: "residential_rent_dispute",
            applicable: false,
            explanation: "Not RERA for ordinary rent disputes.",
          },
        ],
        steps: [
          {
            id: "step-1",
            title: "Seek help",
            body: "Speak with a qualified lawyer.",
            citations: [],
          },
        ],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "MRCA",
        },
      },
      usage: { promptTokens: 1, completionTokens: 2 },
      retried: false,
      retrievedCount: 2,
    });

    const first = await optionsRequest(token);
    expect(first.status).toBe(200);
    const body1 = await first.json();
    expect(body1.escalation).toBe(true);
    expect(body1.cached).toBe(false);

    const session = sessionStore.get(token);
    expect(session?.escalation).toBe(true);
    expect(session?.options).toBeDefined();

    const second = await optionsRequest(token);
    const body2 = await second.json();
    expect(body2.cached).toBe(true);
    expect(runOptionsMock).toHaveBeenCalledTimes(1);

    const logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).not.toContain("Speak with a qualified lawyer");
    expect(logged).toContain('"escalation":true');
  });

  it("persists escalation flag even when options fails after guard", async () => {
    const token = await uploadSample();
    runOptionsMock.mockResolvedValue({
      ok: false,
      code: "NO_RETRIEVAL",
      message: "No statute excerpts matched.",
      escalation: true,
      reraChecks: [
        {
          disputeType: "residential_rent_dispute",
          applicable: false,
          explanation: "n/a",
        },
      ],
      regime: {
        state: "Maharashtra",
        category: "residential_rent",
        code: "rent_control",
        label: "MRCA",
      },
    });

    const res = await optionsRequest(token);
    expect(res.status).toBe(422);
    expect(sessionStore.get(token)?.escalation).toBe(true);
  });

  it("returns 503 when AI is not configured", async () => {
    const token = await uploadSample();
    runOptionsMock.mockResolvedValue({
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "AI is temporarily unavailable. Try again shortly.",
    });
    const res = await optionsRequest(token);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("AI_NOT_CONFIGURED");
    expect(body.error.message).not.toMatch(/GROQ_API_KEY/);
  });

  it("maps provider RATE_LIMITED to 429", async () => {
    const token = await uploadSample();
    runOptionsMock.mockResolvedValue({
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Try again shortly.",
    });
    const res = await optionsRequest(token);
    expect(res.status).toBe(429);
  });

  it("returns 429 when lock is held", async () => {
    const token = await uploadSample();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    runOptionsMock.mockImplementation(async () => {
      await gate;
      return {
        ok: true,
        options: {
          escalation: false,
          reraChecks: [],
          steps: [],
          regime: {
            state: "Maharashtra",
            category: "residential_rent",
            code: "rent_control",
            label: "MRCA",
          },
        },
        usage: {},
        retried: false,
        retrievedCount: 0,
      };
    });

    const firstPromise = optionsRequest(token);
    await vi.waitFor(() => {
      expect(runOptionsMock).toHaveBeenCalled();
    });
    const second = await optionsRequest(token);
    expect(second.status).toBe(429);
    release();
    await firstPromise;
  });
});
