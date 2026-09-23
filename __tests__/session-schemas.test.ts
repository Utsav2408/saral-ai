/**
 * Public DTO Zod schemas — parse helpers at API/client boundaries.
 */

import { describe, expect, it } from "vitest";
import {
  parseWithSchema,
  sessionPublicSchema,
  simplifyResponseSchema,
  summaryResponseSchema,
  optionsResponseSchema,
  apiErrorBodySchema,
} from "@/lib/schemas/session";

describe("session schemas", () => {
  it("accepts a valid SessionPublic", () => {
    const parsed = parseWithSchema(sessionPublicSchema, {
      token: "a".repeat(43),
      title: "Lease",
      sourceFilename: "lease.txt",
      mimeType: "text/plain",
      createdAt: 1,
      clauses: [{ id: "c-1", index: 1, text: "Rent." }],
      facts: { state: "Maharashtra" },
      clauseCount: 1,
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects SessionPublic missing clauseCount", () => {
    const parsed = parseWithSchema(sessionPublicSchema, {
      token: "a".repeat(43),
      title: "Lease",
      sourceFilename: "lease.txt",
      mimeType: "text/plain",
      createdAt: 1,
      clauses: [],
      facts: {},
    });
    expect(parsed.ok).toBe(false);
  });

  it("accepts SimplifyResponse", () => {
    const parsed = parseWithSchema(simplifyResponseSchema, {
      token: "t",
      title: "L",
      clauses: [{ id: "c-1", index: 1, text: "x" }],
      simplifiedClauses: [
        { clauseId: "c-1", simpleText: "y", entityCheckPassed: true },
      ],
      cached: false,
    });
    expect(parsed.ok).toBe(true);
  });

  it("accepts SummaryResponse and OptionsResponse shapes", () => {
    expect(
      parseWithSchema(summaryResponseSchema, {
        token: "t",
        title: "L",
        facts: {},
        flags: [],
        flagDescriptions: [],
        checklist: [],
        overview: "ok",
        cached: true,
      }).ok,
    ).toBe(true);

    expect(
      parseWithSchema(optionsResponseSchema, {
        token: "t",
        title: "L",
        escalation: false,
        reraChecks: [],
        steps: [],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "MRCA",
        },
        cached: false,
      }).ok,
    ).toBe(true);
  });

  it("parses ApiErrorBody", () => {
    const parsed = parseWithSchema(apiErrorBodySchema, {
      error: { code: "NOT_FOUND", message: "gone" },
    });
    expect(parsed.ok).toBe(true);
  });
});
