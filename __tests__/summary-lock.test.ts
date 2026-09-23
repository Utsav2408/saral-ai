import { afterEach, describe, expect, it } from "vitest";
import {
  clearSummaryLocks,
  releaseSummaryLock,
  tryAcquireSummaryLock,
} from "@/lib/ai/summary-lock";

afterEach(() => {
  clearSummaryLocks();
});

describe("summary-lock", () => {
  it("blocks in-flight and cooldown", () => {
    const token = "s".repeat(43);
    expect(tryAcquireSummaryLock(token).ok).toBe(true);
    expect(tryAcquireSummaryLock(token).ok).toBe(false);
    releaseSummaryLock(token);
    const again = tryAcquireSummaryLock(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });
});
