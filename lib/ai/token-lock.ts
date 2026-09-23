/**
 * In-process concurrency + cooldown locks for GenAI activities.
 * One factory, four named instances — O(1) acquire/release per token.
 */

import {
  CHAT_COOLDOWN_MS,
  OPTIONS_COOLDOWN_MS,
  SIMPLIFY_COOLDOWN_MS,
  SUMMARY_COOLDOWN_MS,
} from "@/lib/constants";

type LockState = {
  inFlight: boolean;
  lastFinishedAt: number;
};

export type AcquireResult =
  | { ok: true }
  | { ok: false; reason: "in_flight" | "cooldown" };

export type TokenLock = {
  tryAcquire: (token: string) => AcquireResult;
  release: (token: string) => void;
  /** Tests only — clear all tokens for this activity. */
  clear: () => void;
};

/** Build an isolated lock map with the given cooldown window. */
export function createTokenLock(cooldownMs: number): TokenLock {
  const locks = new Map<string, LockState>();

  return {
    tryAcquire(token: string): AcquireResult {
      const now = Date.now();
      const state = locks.get(token);
      if (state?.inFlight) {
        return { ok: false, reason: "in_flight" };
      }
      if (state && now - state.lastFinishedAt < cooldownMs) {
        return { ok: false, reason: "cooldown" };
      }
      locks.set(token, {
        inFlight: true,
        lastFinishedAt: state?.lastFinishedAt ?? 0,
      });
      return { ok: true };
    },

    release(token: string): void {
      locks.set(token, { inFlight: false, lastFinishedAt: Date.now() });
    },

    clear(): void {
      locks.clear();
    },
  };
}

/** Per-activity locks — isolated so one activity never blocks another. */
export const chatLock = createTokenLock(CHAT_COOLDOWN_MS);
export const simplifyLock = createTokenLock(SIMPLIFY_COOLDOWN_MS);
export const summaryLock = createTokenLock(SUMMARY_COOLDOWN_MS);
export const optionsLock = createTokenLock(OPTIONS_COOLDOWN_MS);
