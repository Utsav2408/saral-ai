import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/session";

/**
 * Build a consistent JSON error response without leaking internals.
 */
export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}
