/**
 * Client helper for activity POST loads with one soft 429 auto-retry.
 * Complexity: O(1) network round-trips (at most 2).
 */

import { mapApiErrorFromBody } from "@/lib/api/map-api-error";

const RATE_LIMIT_RETRY_MS = 3_000;

export type ActivityFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; expired: boolean };

/**
 * POST an activity endpoint once; on 429, wait briefly and retry once.
 */
export async function fetchActivityOnce<T>(
  url: string,
  fallback: string,
  options?: { allowAutoRetry429?: boolean },
): Promise<ActivityFetchResult<T>> {
  const allowAutoRetry429 = options?.allowAutoRetry429 !== false;

  const attempt = async (): Promise<ActivityFetchResult<T>> => {
    try {
      const res = await fetch(url, { method: "POST" });
      const body = (await res.json()) as
        | T
        | { error: { code: string; message: string } };

      if (!res.ok || (body && typeof body === "object" && "error" in body)) {
        const message = mapApiErrorFromBody(res.status, body, fallback);
        return {
          ok: false,
          status: res.status,
          message,
          expired: res.status === 404,
        };
      }

      return { ok: true, data: body as T };
    } catch {
      return {
        ok: false,
        status: 0,
        message: fallback,
        expired: false,
      };
    }
  };

  const first = await attempt();
  if (first.ok) return first;
  if (first.status === 429 && allowAutoRetry429) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_MS));
    return attempt();
  }
  return first;
}

/** Home URL with expired reason (caller clears the session token). */
export function sessionExpiredHomeHref(): string {
  return "/?reason=expired";
}
