import { describe, expect, it, vi } from "vitest";
import { buildOptionsQuery, buildOptionsPrompt, runOptions } from "@/lib/ai/options";
import type { StatuteHit } from "@/lib/corpus/types";
import type { Session } from "@/types/session";

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
        id: "c-5",
        index: 5,
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

describe("options helpers", () => {
  it("buildOptionsQuery includes state and themes", () => {
    const q = buildOptionsQuery("Maharashtra", ["missing_receipt"]);
    expect(q).toContain("Maharashtra");
    expect(q).toContain("missing_receipt");
  });

  it("buildOptionsPrompt includes escalation and rera", () => {
    const prompt = buildOptionsPrompt({
      escalation: true,
      regime: {
        state: "Maharashtra",
        category: "residential_rent",
        code: "rent_control",
        label: "MRCA",
        stateCode: "MH",
        known: true,
      },
      flags: [
        {
          id: "flag-missing_receipt",
          ruleId: "missing_receipt",
          severity: "info",
        },
      ],
      reraChecks: [
        {
          disputeType: "residential_rent_dispute",
          applicable: false,
          explanation: "Not RERA",
        },
      ],
      hits: [hit],
      clauses: baseSession().clauses,
      facts: baseSession().facts,
    });
    expect(prompt).toContain("escalation=true");
    expect(prompt).toContain("residential_rent_dispute");
    expect(prompt).toContain("mh-mrca-s15");
  });
});

describe("runOptions", () => {
  it("returns AI_NOT_CONFIGURED when key missing", async () => {
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const result = await runOptions({ session: baseSession() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AI_NOT_CONFIGURED");
    if (prev) process.env.GROQ_API_KEY = prev;
  });

  it("happy path with escalation fixture language", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockResolvedValue({
      output: {
        steps: [
          {
            id: "step-1",
            title: "Speak with a lawyer",
            body: "Because of escalation signals, seek qualified help about your Maharashtra lease and deposit of 150000.",
            citations: [
              { id: "mh-mrca-s15", label: "MRCA" },
              { id: "lease:c-2", label: "Deposit clause" },
            ],
          },
          {
            id: "step-2",
            title: "Keep records",
            body: "Save written copies of notices and payments under your lease.",
            citations: [{ id: "lease:c-5", label: "Notice" }],
          },
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    const result = await runOptions({
      session: baseSession({
        clauses: [
          {
            id: "c-1",
            index: 1,
            text: "Party filed an FIR and a police complaint about the premises.",
          },
          ...baseSession().clauses,
        ],
      }),
      generate: generate as never,
      lookup: () => [hit],
      detect: () => [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.escalation).toBe(true);
      expect(result.options.reraChecks.length).toBeGreaterThan(0);
      expect(result.options.steps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns NO_RETRIEVAL when lookup empty", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const result = await runOptions({
      session: baseSession(),
      lookup: () => [],
      detect: () => [],
      escalate: () => ({ triggered: false, matchedTermCount: 0 }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NO_RETRIEVAL");
      expect(result.reraChecks?.length).toBeGreaterThan(0);
    }
  });

  it("returns NO_CLAUSES for empty session", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const result = await runOptions({
      session: baseSession({ clauses: [] }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_CLAUSES");
  });

  it("returns OPTIONS_FAILED when generate throws", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const generate = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await runOptions({
      session: baseSession(),
      generate: generate as never,
      lookup: () => [hit],
      detect: () => [],
      escalate: () => ({ triggered: false, matchedTermCount: 0 }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("OPTIONS_FAILED");
  });

  it("retries then VALIDATION_FAILED on bad citations", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const bad = {
      output: {
        steps: [
          {
            id: "step-1",
            title: "Invented",
            body: "Cite a fake statute.",
            citations: [{ id: "fake-id", label: "Fake" }],
          },
        ],
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    };
    const generate = vi.fn().mockResolvedValue(bad);
    const result = await runOptions({
      session: baseSession(),
      generate: generate as never,
      lookup: () => [hit],
      detect: () => [],
      escalate: () => ({ triggered: false, matchedTermCount: 0 }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
