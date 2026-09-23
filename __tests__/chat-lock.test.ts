import { afterEach, describe, expect, it } from "vitest";
import { clearChatLocks, tryAcquireChatLock, releaseChatLock } from "@/lib/ai/chat-lock";

afterEach(() => {
  clearChatLocks();
});

describe("chat-lock", () => {
  it("blocks in-flight and cooldown", () => {
    const token = "t".repeat(43);
    expect(tryAcquireChatLock(token).ok).toBe(true);
    expect(tryAcquireChatLock(token).ok).toBe(false);
    releaseChatLock(token);
    const again = tryAcquireChatLock(token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("cooldown");
  });
});
