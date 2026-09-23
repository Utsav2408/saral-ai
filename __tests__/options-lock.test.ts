import { afterEach, describe, expect, it } from "vitest";
import {
  clearOptionsLocks,
  releaseOptionsLock,
  tryAcquireOptionsLock,
} from "@/lib/ai/options-lock";

afterEach(() => {
  clearOptionsLocks();
});

describe("options-lock", () => {
  it("blocks in-flight and cooldown", () => {
    const token = "o".repeat(43);
    expect(tryAcquireOptionsLock(token).ok).toBe(true);
    expect(tryAcquireOptionsLock(token).ok).toBe(false);
    releaseOptionsLock(token);
    const again = tryAcquireOptionsLock(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });
});
