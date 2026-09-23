import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadPOST } from "@/app/api/upload/route";
import {
  clearChatLocks,
  POST as chatPOST,
} from "@/app/api/session/[token]/chat/route";
import { sessionStore } from "@/lib/session/store";

vi.mock("@/lib/ai/chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/chat")>();
  return {
    ...actual,
    runChatTurn: vi.fn(),
  };
});

import { runChatTurn } from "@/lib/ai/chat";

const runChatTurnMock = vi.mocked(runChatTurn);

afterEach(() => {
  sessionStore.clear();
  clearChatLocks();
  runChatTurnMock.mockReset();
  vi.restoreAllMocks();
});

beforeEach(() => {
  clearChatLocks();
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

function chatRequest(token: string, message: unknown) {
  return chatPOST(
    new Request(`http://localhost/api/session/${token}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),
    { params: Promise.resolve({ token }) },
  );
}

describe("POST /api/session/[token]/chat", () => {
  it("returns 400 for invalid token", async () => {
    const res = await chatPOST(
      new Request("http://localhost/api/session/bad/chat", {
        method: "POST",
        body: JSON.stringify({ message: "hi" }),
      }),
      { params: Promise.resolve({ token: "bad" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 404 for unknown token", async () => {
    const token = "a".repeat(43);
    const res = await chatRequest(token, "hi");
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty message via runChatTurn", async () => {
    const token = await uploadSample();
    runChatTurnMock.mockResolvedValue({
      ok: false,
      code: "EMPTY_MESSAGE",
      message: "Please enter a question about your lease.",
    });
    const res = await chatRequest(token, "   ");
    expect(res.status).toBe(400);
  });

  it("returns 503 when AI is not configured", async () => {
    const token = await uploadSample();
    runChatTurnMock.mockResolvedValue({
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "AI is not configured. Set GROQ_API_KEY on the server.",
    });
    const res = await chatRequest(token, "Is my deposit legal?");
    expect(res.status).toBe(503);
  });

  it("returns 429 when lock is held", async () => {
    const token = await uploadSample();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    runChatTurnMock.mockImplementation(async () => {
      await gate;
      return {
        ok: true,
        reply: { role: "assistant", content: "ok" },
        messages: [],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "x",
          stateCode: "MH",
          known: true,
        },
        retrievedCount: 1,
        usage: {},
        retried: false,
      };
    });

    const firstPromise = chatRequest(token, "first");
    await new Promise((r) => setTimeout(r, 20));
    const second = await chatRequest(token, "second");
    expect(second.status).toBe(429);
    release();
    await firstPromise;
  });

  it("happy path stores messages and logs no content", async () => {
    const token = await uploadSample();
    runChatTurnMock.mockResolvedValue({
      ok: true,
      reply: {
        role: "assistant",
        content: "Deposit rules depend on your lease and the Act.",
        citations: [
          {
            id: "mh-mrca-s15",
            label: "Maharashtra Rent Control Act",
            sourceUrl: "https://www.indiacode.nic.in/handle/123456789/15817",
          },
          { id: "lease:c-2", label: "Your lease · Clause 2" },
        ],
      },
      messages: [
        { role: "user", content: "Can landlord keep deposit?" },
        {
          role: "assistant",
          content: "Deposit rules depend on your lease and the Act.",
          citations: [
            {
              id: "mh-mrca-s15",
              label: "Maharashtra Rent Control Act",
            },
          ],
        },
      ],
      regime: {
        state: "Maharashtra",
        category: "residential_rent",
        code: "rent_control",
        label: "Maharashtra Rent Control Act, 1999",
        stateCode: "MH",
        known: true,
      },
      retrievedCount: 3,
      usage: { promptTokens: 100, completionTokens: 40 },
      retried: false,
    });

    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      logs.push(String(line));
    });

    const res = await chatRequest(token, "Can landlord keep deposit?");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply.citations.length).toBeGreaterThan(0);
    expect(body.regime.code).toBe("rent_control");

    const session = sessionStore.get(token);
    expect(session?.messages.length).toBe(2);

    const joined = logs.join("\n");
    expect(joined).not.toMatch(/1,50,000|Can landlord keep|Deposit rules/i);
    expect(joined).toMatch(/"activity":"chat"/);
  });
});
