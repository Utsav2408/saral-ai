/**
 * Client helper for activity POST loads with one soft 429 auto-retry.
 * Complexity: O(1) network round-trips (at most 2).
 */

import type { z } from "zod";
import { mapApiErrorFromBody } from "@/lib/api/map-api-error";
import { parseWithSchema } from "@/lib/schemas/session";

const RATE_LIMIT_RETRY_MS = 3_000;

export type ActivityFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; expired: boolean };

export type FetchActivityOptions<T> = {
  allowAutoRetry429?: boolean;
  /** When set, success bodies must match this schema. */
  schema?: z.ZodType<T>;
  /** Optional JSON body (e.g. `{ locale: "hi" }` for Simplify). */
  body?: unknown;
};

/**
 * POST an activity endpoint once; on 429, wait briefly and retry once.
 */
export async function fetchActivityOnce<T>(
  url: string,
  fallback: string,
  options?: FetchActivityOptions<T>,
): Promise<ActivityFetchResult<T>> {
  const allowAutoRetry429 = options?.allowAutoRetry429 !== false;

  const attempt = async (): Promise<ActivityFetchResult<T>> => {
    try {
      const init: RequestInit = { method: "POST" };
      if (options?.body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(options.body);
      }
      const res = await fetch(url, init);
      const body: unknown = await res.json();

      if (
        !res.ok ||
        (body && typeof body === "object" && body !== null && "error" in body)
      ) {
        const message = mapApiErrorFromBody(res.status, body, fallback);
        return {
          ok: false,
          status: res.status,
          message,
          expired: res.status === 404,
        };
      }

      if (options?.schema) {
        const parsed = parseWithSchema(options.schema, body);
        if (!parsed.ok) {
          return {
            ok: false,
            status: res.status,
            message: fallback,
            expired: false,
          };
        }
        return { ok: true, data: parsed.data };
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
