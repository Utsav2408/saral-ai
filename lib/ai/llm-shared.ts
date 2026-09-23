/**
 * Shared LLM plumbing: token usage, error mapping, prompt text helpers.
 * Keep activity-specific prompts and orchestration in their own modules.
 */

import { APICallError } from "ai";
import { z } from "zod";
import {
  clarityModel,
  requireGroqApiKey,
  type ClarityLanguageModel,
} from "@/lib/ai/groq";
import {
  AI_UNAVAILABLE_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "@/lib/api/map-api-error";
import {
  MAX_PROMPT_CLAUSE_CHARS,
  MAX_PROMPT_CLAUSES,
} from "@/lib/constants";
import type { Clause, ExtractedFacts } from "@/types/session";

/** Provider token counts normalized for safeLog / activity results. */
export type LlmUsage = {
  promptTokens?: number;
  completionTokens?: number;
};

/**
 * Normalize AI SDK usage fields into our metadata shape.
 */
export function usageFromResult(usage: {
  inputTokens?: number | null;
  outputTokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
}): LlmUsage {
  return {
    promptTokens: usage.inputTokens ?? usage.promptTokens ?? undefined,
    completionTokens:
      usage.outputTokens ?? usage.completionTokens ?? undefined,
  };
}

/**
 * Sum token counts across retries (undefined when both sides are empty).
 */
export function mergeUsage(a?: LlmUsage, b?: LlmUsage): LlmUsage {
  const promptTokens = (a?.promptTokens ?? 0) + (b?.promptTokens ?? 0);
  const completionTokens =
    (a?.completionTokens ?? 0) + (b?.completionTokens ?? 0);
  return {
    promptTokens: promptTokens > 0 ? promptTokens : undefined,
    completionTokens: completionTokens > 0 ? completionTokens : undefined,
  };
}

/** Truncate prompt text with an ellipsis when over the limit. */
export function truncatePromptText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/** Escape a value for use inside a double-quoted XML attribute. */
export function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Shared citation object schema for Chat / Options structured output.
 */
export const citationOutputSchema = z.object({
  id: z.string().describe("Retrieved chunk id or lease:c-N clause id"),
  label: z.string().describe("Short citation pill label"),
});

export type FactPromptField =
  | "state"
  | "deposit"
  | "notice"
  | "leaseStart"
  | "leaseEnd"
  | "propertyType"
  | "depositCurrency";

const FACT_FORMATTERS: Record<
  FactPromptField,
  (facts: ExtractedFacts) => string | null
> = {
  state: (f) => (f.state ? `state=${f.state}` : null),
  deposit: (f) =>
    f.depositAmount != null ? `deposit=${f.depositAmount}` : null,
  notice: (f) => (f.noticePeriod ? `notice=${f.noticePeriod}` : null),
  leaseStart: (f) => (f.leaseStart ? `leaseStart=${f.leaseStart}` : null),
  leaseEnd: (f) => (f.leaseEnd ? `leaseEnd=${f.leaseEnd}` : null),
  propertyType: (f) =>
    f.propertyType ? `propertyType=${f.propertyType}` : null,
  depositCurrency: (f) =>
    f.depositCurrency ? `currency=${f.depositCurrency}` : null,
};

/**
 * Format extracted facts as `key=value` lines for LLM prompts.
 * Empty when no selected fields have values.
 */
export function formatFactsForPrompt(
  facts: ExtractedFacts,
  fields: readonly FactPromptField[],
  joinWith = "; ",
): string {
  return fields
    .map((field) => FACT_FORMATTERS[field](facts))
    .filter(Boolean)
    .join(joinWith);
}

type PackClausesOptions = {
  maxClauses?: number;
  maxChars?: number;
  /** XML element name, e.g. `clause` or `lease-clause`. */
  tag?: string;
  joinWith?: string;
  /** Include index= and optional heading= attributes. */
  includeIndex?: boolean;
  includeHeading?: boolean;
};

/**
 * Pack lease clauses into fenced XML blocks for untrusted prompt data.
 */
export function packClausesXml(
  clauses: Clause[],
  options: PackClausesOptions = {},
): string {
  const maxClauses = options.maxClauses ?? MAX_PROMPT_CLAUSES;
  const maxChars = options.maxChars ?? MAX_PROMPT_CLAUSE_CHARS;
  const tag = options.tag ?? "clause";
  const joinWith = options.joinWith ?? "\n\n";
  const includeIndex = options.includeIndex ?? false;
  const includeHeading = options.includeHeading ?? false;

  return clauses
    .slice(0, maxClauses)
    .map((c) => {
      const body = truncatePromptText(c.text, maxChars);
      const indexAttr = includeIndex ? ` index="${c.index}"` : "";
      const headingAttr =
        includeHeading && c.heading
          ? ` heading="${escapeXmlAttr(c.heading)}"`
          : "";
      return `<${tag} id="${escapeXmlAttr(c.id)}"${indexAttr}${headingAttr}>\n${body}\n</${tag}>`;
    })
    .join(joinWith);
}

type AiConfigFailure = {
  ok: false;
  code: "AI_NOT_CONFIGURED";
  message: string;
};

/** Gate GenAI orchestration on GROQ_API_KEY without leaking env details. */
export function ensureAiConfigured(): { ok: true } | AiConfigFailure {
  try {
    requireGroqApiKey();
    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: AI_UNAVAILABLE_MESSAGE,
    };
  }
}

/**
 * Prefer an injected test model; otherwise require GROQ_API_KEY + default.
 */
export function resolveClarityModel(
  override?: ClarityLanguageModel,
): { ok: true; model: ClarityLanguageModel } | AiConfigFailure {
  if (override) return { ok: true, model: override };
  const configured = ensureAiConfigured();
  if (!configured.ok) return configured;
  return { ok: true, model: clarityModel };
}

type MappedLlmFailure<TCode extends string> = {
  ok: false;
  code: TCode | "AI_NOT_CONFIGURED" | "RATE_LIMITED";
  message: string;
};

/**
 * Map provider / config errors to a typed activity failure.
 * Pass `failureCode` + `failureMessage` for activity-specific fallbacks.
 */
export function mapLlmError<TCode extends string>(
  err: unknown,
  failureCode: TCode,
  failureMessage: string,
): MappedLlmFailure<TCode> {
  if (err instanceof Error && err.name === "AiNotConfiguredError") {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: AI_UNAVAILABLE_MESSAGE,
    };
  }
  if (APICallError.isInstance(err) && err.statusCode === 429) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: RATE_LIMITED_MESSAGE,
    };
  }
  return { ok: false, code: failureCode, message: failureMessage };
}
