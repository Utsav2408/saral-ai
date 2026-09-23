/**
 * Acquire / release pattern for GenAI activity routes.
 * Complexity: O(1) lock ops around the async work callback.
 */

import type { AcquireResult } from "@/lib/ai/token-lock";

export type WithTokenLockArgs<T> = {
  tryAcquire: (token: string) => AcquireResult;
  release: (token: string) => void;
  token: string;
  /** Returned when acquire fails (in-flight or cooldown). */
  blocked: () => T;
  work: () => Promise<T>;
};

/**
 * Run `work` under an in-process token lock.
 * On acquire failure, returns `blocked()` without calling `work`.
 * Always releases when acquire succeeded, even if `work` throws.
 */
export async function withTokenLock<T>({
  tryAcquire,
  release,
  token,
  blocked,
  work,
}: WithTokenLockArgs<T>): Promise<T> {
  const lock = tryAcquire(token);
  if (!lock.ok) return blocked();
  try {
    return await work();
  } finally {
    release(token);
  }
}
