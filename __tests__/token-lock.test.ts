/**
 * Token-lock factory — one shared implementation for all GenAI activities.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  chatLock,
  optionsLock,
  simplifyLock,
  summaryLock,
} from "@/lib/ai/token-lock";

afterEach(() => {
  chatLock.clear();
  simplifyLock.clear();
  summaryLock.clear();
  optionsLock.clear();
});

describe("token-lock", () => {
  it("chat: blocks in-flight and cooldown", () => {
    const token = "t".repeat(43);
    expect(chatLock.tryAcquire(token).ok).toBe(true);
    expect(chatLock.tryAcquire(token).ok).toBe(false);
    chatLock.release(token);
    const again = chatLock.tryAcquire(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });

  it("simplify: blocks in-flight and cooldown", () => {
    const token = "s".repeat(43);
    expect(simplifyLock.tryAcquire(token).ok).toBe(true);
    expect(simplifyLock.tryAcquire(token).ok).toBe(false);
    simplifyLock.release(token);
    const again = simplifyLock.tryAcquire(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });

  it("summary: blocks in-flight and cooldown", () => {
    const token = "u".repeat(43);
    expect(summaryLock.tryAcquire(token).ok).toBe(true);
    expect(summaryLock.tryAcquire(token).ok).toBe(false);
    summaryLock.release(token);
    const again = summaryLock.tryAcquire(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });

  it("options: blocks in-flight and cooldown", () => {
    const token = "o".repeat(43);
    expect(optionsLock.tryAcquire(token).ok).toBe(true);
    expect(optionsLock.tryAcquire(token).ok).toBe(false);
    optionsLock.release(token);
    const again = optionsLock.tryAcquire(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });

  it("keeps activity locks isolated", () => {
    const token = "x".repeat(43);
    expect(chatLock.tryAcquire(token).ok).toBe(true);
    expect(simplifyLock.tryAcquire(token).ok).toBe(true);
    expect(summaryLock.tryAcquire(token).ok).toBe(true);
    expect(optionsLock.tryAcquire(token).ok).toBe(true);
  });
});
