import { afterEach, describe, expect, it, vi } from "vitest";
import { safeLog } from "@/lib/logging/safe-log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safeLog", () => {
  it("emits only allowlisted metadata keys", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    safeLog({
      activity: "chat",
      ok: true,
      latencyMs: 12,
      validated: true,
      retrievedCount: 2,
      promptTokens: 100,
      completionTokens: 40,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]![0]);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const allowed = new Set([
      "ts",
      "activity",
      "ok",
      "latencyMs",
      "bytes",
      "mime",
      "code",
      "clauseCount",
      "ext",
      "validated",
      "cached",
      "promptTokens",
      "completionTokens",
      "inventedCount",
      "retrievedCount",
      "escalation",
      "flagCount",
      "checklistCount",
    ]);
    for (const key of Object.keys(parsed)) {
      expect(allowed.has(key)).toBe(true);
    }
    expect(line).not.toMatch(/deposit|clause text|user said|FIR|court/i);
  });

  it("never includes document-shaped fields even if typed narrowly", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    safeLog({
      activity: "summary",
      ok: false,
      code: "VALIDATION_FAILED",
      flagCount: 2,
      checklistCount: 3,
    });
    const line = String(spy.mock.calls[0]![0]);
    expect(line).not.toContain('"content"');
    expect(line).not.toContain("Ask for receipts");
    expect(line).not.toContain("overview prose");
  });
});
