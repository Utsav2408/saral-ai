/**
 * Shared LLM helpers used by every GenAI activity.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensureAiConfigured,
  escapeXmlAttr,
  formatFactsForPrompt,
  mergeUsage,
  packClausesXml,
  resolveClarityModel,
  truncatePromptText,
  usageFromResult,
} from "@/lib/ai/llm-shared";
import { withTokenLock } from "@/lib/api/with-token-lock";
import { createTokenLock } from "@/lib/ai/token-lock";
import type { ClarityLanguageModel } from "@/lib/ai/groq";
import type { Clause } from "@/types/session";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("llm-shared", () => {
  it("usageFromResult prefers AI SDK input/output fields", () => {
    expect(
      usageFromResult({
        inputTokens: 10,
        outputTokens: 4,
        promptTokens: 99,
        completionTokens: 99,
      }),
    ).toEqual({ promptTokens: 10, completionTokens: 4 });
  });

  it("mergeUsage sums retry tokens", () => {
    expect(
      mergeUsage(
        { promptTokens: 3, completionTokens: 2 },
        { promptTokens: 5, completionTokens: 1 },
      ),
    ).toEqual({ promptTokens: 8, completionTokens: 3 });
  });

  it("truncatePromptText and escapeXmlAttr are O(1) helpers", () => {
    expect(truncatePromptText("abcdef", 4)).toBe("abcd…");
    expect(escapeXmlAttr(`a&b"c<d`)).toBe("a&amp;b&quot;c&lt;d");
  });

  it("formatFactsForPrompt joins selected fields", () => {
    expect(
      formatFactsForPrompt(
        { state: "Maharashtra", depositAmount: 50_000, noticePeriod: "1 month" },
        ["state", "deposit", "notice"],
      ),
    ).toBe("state=Maharashtra; deposit=50000; notice=1 month");
    expect(formatFactsForPrompt({}, ["state", "deposit"])).toBe("");
  });

  it("packClausesXml fences untrusted clause bodies", () => {
    const clauses: Clause[] = [
      { id: "c-1", index: 1, heading: 'A "quote"', text: "Rent due." },
    ];
    const xml = packClausesXml(clauses, {
      includeIndex: true,
      includeHeading: true,
    });
    expect(xml).toContain('<clause id="c-1" index="1" heading="A &quot;quote&quot;">');
    expect(xml).toContain("Rent due.");
  });

  it("ensureAiConfigured maps missing key to AI_NOT_CONFIGURED", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const result = ensureAiConfigured();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AI_NOT_CONFIGURED");
  });

  it("resolveClarityModel prefers an injected override", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fake = {} as ClarityLanguageModel;
    const result = resolveClarityModel(fake);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.model).toBe(fake);
  });

  it("resolveClarityModel fails without key when no override", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const result = resolveClarityModel();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AI_NOT_CONFIGURED");
  });
});

describe("withTokenLock", () => {
  it("runs work when acquired and always releases", async () => {
    const lock = createTokenLock(0);
    let ran = false;
    const out = await withTokenLock({
      tryAcquire: lock.tryAcquire,
      release: lock.release,
      token: "t".repeat(43),
      blocked: () => "blocked",
      work: async () => {
        ran = true;
        return "ok";
      },
    });
    expect(out).toBe("ok");
    expect(ran).toBe(true);
    // Lock released — cooldown is 0 so re-acquire succeeds.
    expect(lock.tryAcquire("t".repeat(43)).ok).toBe(true);
    lock.release("t".repeat(43));
  });

  it("returns blocked without running work when lock fails", async () => {
    const lock = createTokenLock(60_000);
    const token = "u".repeat(43);
    expect(lock.tryAcquire(token).ok).toBe(true);
    let ran = false;
    const out = await withTokenLock({
      tryAcquire: lock.tryAcquire,
      release: lock.release,
      token,
      blocked: () => "blocked",
      work: async () => {
        ran = true;
        return "ok";
      },
    });
    expect(out).toBe("blocked");
    expect(ran).toBe(false);
    lock.clear();
  });
});
