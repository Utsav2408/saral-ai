/**
 * In-process concurrency + cooldown lock for Options per session token.
 * Complexity: O(1) per acquire/release.
 */

import { OPTIONS_COOLDOWN_MS } from "@/lib/constants";

type LockState = {
  inFlight: boolean;
  lastFinishedAt: number;
};

const locks = new Map<string, LockState>();

export type AcquireResult =
  | { ok: true }
  | { ok: false; reason: "in_flight" | "cooldown" };

/**
 * Try to acquire the options lock for a token.
 * Caller must always {@link releaseOptionsLock} in a finally block when ok.
 */
export function tryAcquireOptionsLock(token: string): AcquireResult {
  const now = Date.now();
  const state = locks.get(token);
  if (state?.inFlight) {
    return { ok: false, reason: "in_flight" };
  }
  if (state && now - state.lastFinishedAt < OPTIONS_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }
  locks.set(token, { inFlight: true, lastFinishedAt: state?.lastFinishedAt ?? 0 });
  return { ok: true };
}

/** Mark the lock as finished and start the cooldown window. */
export function releaseOptionsLock(token: string): void {
  locks.set(token, { inFlight: false, lastFinishedAt: Date.now() });
}

/** Tests only — clear all locks. */
export function clearOptionsLocks(): void {
  locks.clear();
}
