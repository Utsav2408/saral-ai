/**
 * HTTP status mapping for GenAI activity failure codes.
 */

import { describe, expect, it } from "vitest";
import {
  httpStatusForActivityCode,
  VALIDATION_CODES,
} from "@/lib/api/activity-status";

describe("httpStatusForActivityCode", () => {
  it("maps config and rate-limit codes", () => {
    expect(httpStatusForActivityCode("AI_NOT_CONFIGURED")).toBe(503);
    expect(httpStatusForActivityCode("RATE_LIMITED")).toBe(429);
  });

  it("maps validation codes to 422", () => {
    for (const code of VALIDATION_CODES) {
      expect(httpStatusForActivityCode(code)).toBe(422);
    }
  });

  it("maps client input codes to 400", () => {
    expect(httpStatusForActivityCode("EMPTY_MESSAGE")).toBe(400);
    expect(httpStatusForActivityCode("MESSAGE_TOO_LONG")).toBe(400);
  });

  it("defaults provider failures to 502", () => {
    expect(httpStatusForActivityCode("CHAT_FAILED")).toBe(502);
    expect(httpStatusForActivityCode("SIMPLIFY_FAILED")).toBe(502);
  });
});
