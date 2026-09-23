/**
 * In-process concurrency + cooldown lock for Simplify per session token.
 * Complexity: O(1) per acquire/release.
 */

import { SIMPLIFY_COOLDOWN_MS } from "@/lib/constants";

type LockState = {
  inFlight: boolean;
  lastFinishedAt: number;
};

const locks = new Map<string, LockState>();

export type AcquireResult =
  | { ok: true }
  | { ok: false; reason: "in_flight" | "cooldown" };

/**
 * Try to acquire the simplify lock for a token.
 * Caller must always {@link releaseSimplifyLock} in a finally block when ok.
 */
export function tryAcquireSimplifyLock(token: string): AcquireResult {
  const now = Date.now();
  const state = locks.get(token);
  if (state?.inFlight) {
    return { ok: false, reason: "in_flight" };
  }
  if (state && now - state.lastFinishedAt < SIMPLIFY_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }
  locks.set(token, { inFlight: true, lastFinishedAt: state?.lastFinishedAt ?? 0 });
  return { ok: true };
}

/** Mark the lock as finished and start the cooldown window. */
export function releaseSimplifyLock(token: string): void {
  locks.set(token, { inFlight: false, lastFinishedAt: Date.now() });
}

/** Tests only — clear all locks. */
export function clearSimplifyLocks(): void {
  locks.clear();
}
