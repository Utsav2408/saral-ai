import { describe, expect, it } from "vitest";
import { extractPlainText } from "@/lib/parse/pdf";
import { processDocument } from "@/lib/parse/process";
import { safeLog } from "@/lib/logging/safe-log";
import { MAX_TEXT_CHARS } from "@/lib/constants";

describe("extractPlainText", () => {
  it("decodes utf8 text", () => {
    const result = extractPlainText(Buffer.from("Clause one"));
    expect(result.text).toBe("Clause one");
    expect(result.truncated).toBe(false);
  });

  it("truncates oversized text", () => {
    const big = "a".repeat(MAX_TEXT_CHARS + 50);
    const result = extractPlainText(Buffer.from(big));
    expect(result.text.length).toBe(MAX_TEXT_CHARS);
    expect(result.truncated).toBe(true);
  });

  it("rejects binary-looking buffers", () => {
    const buf = Buffer.alloc(100, 0);
    expect(() => extractPlainText(buf)).toThrow("BINARY_TEXT");
  });
});

describe("processDocument", () => {
  it("processes plain text into clauses and facts", async () => {
    const text = `1. Deposit of ₹10,000.\n2. Notice of 15 days notice applies.\n3. Property in Karnataka.`;
    const result = await processDocument(Buffer.from(text), "text/plain");
    expect(result.clauses.length).toBeGreaterThanOrEqual(2);
    expect(result.facts.depositAmount).toBe(10000);
    expect(result.facts.state).toBe("Karnataka");
  });

  it("throws NO_TEXT for whitespace-only", async () => {
    await expect(
      processDocument(Buffer.from("   \n"), "text/plain"),
    ).rejects.toThrow("NO_TEXT");
  });
});

describe("safeLog", () => {
  it("logs JSON without throwing", () => {
    expect(() =>
      safeLog({ activity: "test", ok: true, latencyMs: 1 }),
    ).not.toThrow();
  });
});
