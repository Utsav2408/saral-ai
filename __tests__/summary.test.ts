import { describe, expect, it, vi } from "vitest";
import {
  buildSummaryGrounding,
  buildSummaryPrompt,
  runSummary,
  validateSummaryOutput,
} from "@/lib/ai/summary";
import type { ConflictFlag, Session } from "@/types/session";

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "a".repeat(43),
    createdAt: Date.now(),
    title: "Sample lease",
    sourceFilename: "lease.txt",
    mimeType: "text/plain",
    rawTextLength: 100,
    clauses: [
      {
        id: "c-2",
        index: 2,
        text: "The Tenant shall pay a security deposit of ₹1,50,000.",
      },
      {
        id: "c-6",
        index: 6,
        text: "Monthly rent of ₹45,000 is payable on the 5th.",
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

const sampleFlags: ConflictFlag[] = [
  {
    id: "flag-missing_receipt",
    ruleId: "missing_receipt",
    severity: "info",
    summaryKey: "gap.missing_receipt",
  },
];

describe("summary helpers", () => {
  it("buildSummaryPrompt includes facts and flags", () => {
    const prompt = buildSummaryPrompt(
      baseSession().facts,
      baseSession().clauses,
      sampleFlags,
    );
    expect(prompt).toContain("flag-missing_receipt");
    expect(prompt).toContain("deposit=150000");
    expect(prompt).toContain("<clause id=");
  });

  it("validateSummaryOutput accepts matching flag ids", () => {
    const grounding = buildSummaryGrounding(
      baseSession().facts,
      baseSession().clauses,
      sampleFlags,
    );
    const result = validateSummaryOutput(
      {
        overview:
          "This Maharashtra lease has a deposit of 150000 and a 1 month notice period.",
        flagDescriptions: [
          {
            flagId: "flag-missing_receipt",
            description: "The lease does not mention giving a rent receipt.",
          },
        ],
        checklist: [
          {
            id: "check-1",
            flagId: "flag-missing_receipt",
            text: "Ask the landlord for written receipts for rent and the 150000 deposit.",
            priority: "medium",
          },
        ],
      },
      sampleFlags,
      grounding,
    );
    expect(result.ok).toBe(true);
  });

  it("validateSummaryOutput rejects unknown flag ids", () => {
    const grounding = buildSummaryGrounding(
      baseSession().facts,
      baseSession().clauses,
      sampleFlags,
    );
    const result = validateSummaryOutput(
      {
        overview: "Overview text without invented numbers.",
        flagDescriptions: [
          { flagId: "flag-fake", description: "Bad id" },
        ],
        checklist: [],
      },
      sampleFlags,
      grounding,
    );
    expect(result.ok).toBe(false);
  });
});

describe("runSummary", () => {
  it("returns AI_NOT_CONFIGURED when key missing", async () => {
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const result = await runSummary({ session: baseSession() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AI_NOT_CONFIGURED");
    if (prev) process.env.GROQ_API_KEY = prev;
  });

  it("returns NO_CLAUSES for empty session", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const result = await runSummary({
      session: baseSession({ clauses: [] }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_CLAUSES");
  });

  it("happy path with mocked generate", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockResolvedValue({
      output: {
        overview:
          "Maharashtra lease with deposit 150000 and 1 month notice. One gap flagged.",
        flagDescriptions: [
          {
            flagId: "flag-missing_receipt",
            description: "No receipt language appears in the lease.",
          },
        ],
        checklist: [
          {
            id: "check-1",
            flagId: "flag-missing_receipt",
            text: "Request written receipts for payments including the 150000 deposit.",
            priority: "high",
          },
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    const result = await runSummary({
      session: baseSession(),
      generate: generate as never,
      detect: () => sampleFlags,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.checklist).toHaveLength(1);
      expect(result.summary.flags).toEqual(sampleFlags);
    }
  });

  it("returns SUMMARY_FAILED when generate throws", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await runSummary({
      session: baseSession(),
      generate: generate as never,
      detect: () => sampleFlags,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SUMMARY_FAILED");
  });

  it("retries then VALIDATION_FAILED on bad flag ids", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const bad = {
      output: {
        overview: "Overview with invented number 99999999.",
        flagDescriptions: [
          { flagId: "flag-not-real", description: "Bad flag." },
        ],
        checklist: [
          {
            id: "check-1",
            text: "Do something about 99999999.",
            priority: "high",
          },
        ],
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    };
    const generate = vi.fn().mockResolvedValue(bad);
    const result = await runSummary({
      session: baseSession(),
      generate: generate as never,
      detect: () => sampleFlags,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
