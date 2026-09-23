import { describe, expect, it, vi } from "vitest";
import {
  appendMessages,
  buildChatMessages,
  buildSystemPrompt,
  normalizeUserMessage,
  runChatTurn,
  windowHistory,
} from "@/lib/ai/chat";
import type { Session } from "@/types/session";
import type { StatuteHit } from "@/lib/corpus/types";
import type { RegimeResult } from "@/lib/tools/state-law-status";

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "a".repeat(43),
    createdAt: Date.now(),
    title: "1BHK Lease — Andheri West",
    sourceFilename: "lease.txt",
    mimeType: "text/plain",
    rawTextLength: 100,
    clauses: [
      {
        id: "c-2",
        index: 2,
        heading: "Deposit",
        text: "The Tenant shall pay a security deposit of ₹1,50,000.",
      },
      {
        id: "c-5",
        index: 5,
        heading: "Notice",
        text: "Either party may terminate by giving 1 month prior notice.",
      },
    ],
    facts: {
      state: "Maharashtra",
      depositAmount: 150000,
      noticePeriod: "1 month",
    },
    messages: [],
    ...overrides,
  };
}

const hit: StatuteHit = {
  id: "mh-mrca-s15",
  score: 0.9,
  citationLabel: "Maharashtra Rent Control Act",
  sourceUrl: "https://www.indiacode.nic.in/handle/123456789/15817",
  instrument: "Maharashtra Rent Control Act, 1999",
  section: "15",
  state: "MH",
  text: "A landlord shall not recover possession while the tenant pays rent…",
};

const regime: RegimeResult = {
  state: "Maharashtra",
  category: "residential_rent",
  code: "rent_control",
  label: "Maharashtra Rent Control Act, 1999",
  stateCode: "MH",
  known: true,
};

describe("chat helpers", () => {
  it("windows history to last 6 messages", () => {
    const msgs = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `m${i}`,
    }));
    expect(windowHistory(msgs)).toHaveLength(6);
    expect(windowHistory(msgs)[0]!.content).toBe("m4");
  });

  it("buildChatMessages includes durable system + windowed history", () => {
    const session = baseSession({
      messages: [
        { role: "user", content: "old1" },
        { role: "assistant", content: "oldA" },
        { role: "user", content: "old2" },
        { role: "assistant", content: "oldB" },
        { role: "user", content: "old3" },
        { role: "assistant", content: "oldC" },
        { role: "user", content: "old4" },
        { role: "assistant", content: "oldD" },
      ],
    });
    const built = buildChatMessages(session, "new?", "SYSTEM");
    expect(built[0]).toEqual({ role: "system", content: "SYSTEM" });
    expect(built.at(-1)).toEqual({ role: "user", content: "new?" });
    // 1 system + 6 history + 1 new user = 8
    expect(built).toHaveLength(8);
    expect(built[1]!.content).toBe("old2");
  });

  it("buildSystemPrompt fences lease and statute text", () => {
    const system = buildSystemPrompt({
      regime,
      facts: baseSession().facts,
      clauses: baseSession().clauses,
      hits: [hit],
    });
    expect(system).toContain("mh-mrca-s15");
    expect(system).toContain("lease-clause");
    expect(system).toContain("untrusted");
  });

  it("appendMessages caps length", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `x${i}`,
    }));
    const next = appendMessages(
      many,
      { role: "user", content: "u" },
      { role: "assistant", content: "a" },
    );
    expect(next.length).toBeLessThanOrEqual(40);
  });

  it("normalizeUserMessage trims", () => {
    expect(normalizeUserMessage("  hi  there  ")).toBe("hi there");
  });
});

describe("runChatTurn", () => {
  it("rejects empty messages without calling the model", async () => {
    const generate = vi.fn();
    const result = await runChatTurn({
      session: baseSession(),
      message: "   ",
      generate,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("EMPTY_MESSAGE");
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns AI_NOT_CONFIGURED when key missing", async () => {
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const result = await runChatTurn({
      session: baseSession(),
      message: "Is my deposit legal?",
      generate: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AI_NOT_CONFIGURED");
    if (prev !== undefined) process.env.GROQ_API_KEY = prev;
  });

  it("succeeds with mocked LLM + lookup", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockResolvedValue({
      output: {
        answer:
          "Leaving early does not by itself let the landlord keep the full deposit under the rent control framework; check your deposit clause.",
        citations: [
          { id: "mh-mrca-s15", label: "Maharashtra Rent Control Act" },
          { id: "lease:c-2", label: "Your lease · Clause 2" },
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    const result = await runChatTurn({
      session: baseSession(),
      message: "Can the landlord keep my full deposit?",
      generate,
      lookup: () => [hit],
      model: {} as never,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reply.citations).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.retrievedCount).toBe(1);
    }
  });

  it("retries once then fails validation", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockResolvedValue({
      output: {
        answer: "The landlord may keep the deposit under secret section 999.",
        citations: [{ id: "forged-chunk", label: "Fake" }],
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    const result = await runChatTurn({
      session: baseSession(),
      message: "Deposit question",
      generate,
      lookup: () => [hit],
      model: {} as never,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("returns NO_RETRIEVAL when lookup is empty", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const result = await runChatTurn({
      session: baseSession(),
      message: "Anything",
      generate: vi.fn(),
      lookup: () => [],
      model: {} as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_RETRIEVAL");
  });

  it("rejects oversized messages", async () => {
    const result = await runChatTurn({
      session: baseSession(),
      message: "x".repeat(2_001),
      generate: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MESSAGE_TOO_LONG");
  });

  it("maps rate-limit errors from the LLM", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const { APICallError } = await import("ai");
    const generate = vi.fn().mockRejectedValue(
      new APICallError({
        message: "rate",
        url: "https://example.com",
        requestBodyValues: {},
        statusCode: 429,
        responseHeaders: {},
        responseBody: "",
      }),
    );
    const result = await runChatTurn({
      session: baseSession(),
      message: "Deposit?",
      generate,
      lookup: () => [hit],
      model: {} as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RATE_LIMITED");
  });

  it("maps generic LLM failures", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await runChatTurn({
      session: baseSession(),
      message: "Deposit?",
      generate,
      lookup: () => [hit],
      model: {} as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CHAT_FAILED");
  });

  it("succeeds on validation retry", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        output: {
          answer: "The landlord may keep the deposit under secret section 999.",
          citations: [{ id: "forged", label: "Fake" }],
        },
        usage: { inputTokens: 1, outputTokens: 1 },
      })
      .mockResolvedValueOnce({
        output: {
          answer: "Check your lease deposit clause and the rent control Act.",
          citations: [
            { id: "mh-mrca-s15", label: "Maharashtra Rent Control Act" },
            { id: "c-2", label: "Clause 2" },
          ],
        },
        usage: { inputTokens: 2, outputTokens: 2 },
      });

    const result = await runChatTurn({
      session: baseSession(),
      message: "Deposit?",
      generate,
      lookup: () => [hit],
      model: {} as never,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.retried).toBe(true);
  });
});
