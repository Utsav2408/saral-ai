/**
 * Consistent JSON API errors — never include stacks or internal details.
 * Pair with {@link mapApiError} on the client for defense-in-depth copy.
 */

import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/session";

/**
 * Build a consistent JSON error response without leaking internals.
 * Complexity: O(1).
 */
export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}
