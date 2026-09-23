/**
 * Runtime Zod schemas for public session / activity DTOs.
 * Keep in sync with types/session.ts — parse at API/client boundaries.
 */

import { z } from "zod";

export const clauseSchema = z.object({
  id: z.string(),
  index: z.number(),
  heading: z.string().optional(),
  text: z.string(),
});

export const extractedFactsSchema = z.object({
  depositAmount: z.number().optional(),
  depositCurrency: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  noticePeriod: z.string().optional(),
  state: z.string().optional(),
  propertyType: z.string().optional(),
});

export const chatCitationSchema = z.object({
  id: z.string(),
  label: z.string(),
  sourceUrl: z.string().optional(),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  citations: z.array(chatCitationSchema).optional(),
});

export const simplifiedClauseSchema = z.object({
  clauseId: z.string(),
  simpleText: z.string(),
  entityCheckPassed: z.boolean(),
});

export const conflictFlagSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  summaryKey: z.string(),
  clauseIds: z.array(z.string()).optional(),
  factRefs: z.array(z.string()).optional(),
});

export const summaryChecklistItemSchema = z.object({
  id: z.string(),
  flagId: z.string().optional(),
  text: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export const summaryResultSchema = z.object({
  flags: z.array(conflictFlagSchema),
  flagDescriptions: z.array(
    z.object({
      flagId: z.string(),
      description: z.string(),
    }),
  ),
  checklist: z.array(summaryChecklistItemSchema),
  overview: z.string(),
});

export const chatRegimeSchema = z.object({
  state: z.string(),
  category: z.string(),
  code: z.string(),
  label: z.string(),
});

export const reraCheckResultSchema = z.object({
  disputeType: z.string(),
  applicable: z.boolean(),
  explanation: z.string(),
  citeChunkId: z.string().optional(),
});

export const optionsStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  citations: z.array(chatCitationSchema).optional(),
});

export const optionsResultSchema = z.object({
  escalation: z.boolean(),
  reraChecks: z.array(reraCheckResultSchema),
  steps: z.array(optionsStepSchema),
  regime: chatRegimeSchema,
});

export const sessionPublicSchema = z.object({
  token: z.string(),
  title: z.string(),
  sourceFilename: z.string(),
  mimeType: z.string(),
  createdAt: z.number(),
  clauses: z.array(clauseSchema),
  facts: extractedFactsSchema,
  clauseCount: z.number(),
});

export const simplifyResponseSchema = z.object({
  token: z.string(),
  title: z.string(),
  clauses: z.array(clauseSchema),
  simplifiedClauses: z.array(simplifiedClauseSchema),
  cached: z.boolean(),
});

export const chatResponseSchema = z.object({
  token: z.string(),
  title: z.string(),
  reply: chatMessageSchema,
  messages: z.array(chatMessageSchema),
  regime: chatRegimeSchema,
});

export const summaryResponseSchema = z.object({
  token: z.string(),
  title: z.string(),
  facts: extractedFactsSchema,
  flags: z.array(conflictFlagSchema),
  flagDescriptions: z.array(
    z.object({
      flagId: z.string(),
      description: z.string(),
    }),
  ),
  checklist: z.array(summaryChecklistItemSchema),
  overview: z.string(),
  cached: z.boolean(),
});

export const optionsResponseSchema = z.object({
  token: z.string(),
  title: z.string(),
  escalation: z.boolean(),
  reraChecks: z.array(reraCheckResultSchema),
  steps: z.array(optionsStepSchema),
  regime: chatRegimeSchema,
  cached: z.boolean(),
});

export const uploadResponseSchema = z.object({
  token: z.string(),
  title: z.string(),
  facts: extractedFactsSchema,
  clauseCount: z.number(),
});

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

/** Response schemas keyed by cached activity id. */
export const CACHED_ACTIVITY_RESPONSE_SCHEMAS = {
  simplify: simplifyResponseSchema,
  summary: summaryResponseSchema,
  options: optionsResponseSchema,
} as const;

/**
 * Parse unknown JSON with a Zod schema.
 * Returns a narrow result so callers never cast blindly.
 */
export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; issues: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { ok: true, data: result.data };
}
