/**
 * Server-only Groq model wiring for Clarity GenAI activities.
 * Never import this module from client components.
 */

import { createGroq, groq, type GroqProvider } from "@ai-sdk/groq";

/** Language model instance returned by the Groq provider. */
export type SimplifyLanguageModel = ReturnType<GroqProvider>;

/** Groq model id used for Simplify (and later activities unless overridden). */
export const SIMPLIFY_MODEL_ID = "llama-3.3-70b-versatile" as const;

/**
 * Typed error when GROQ_API_KEY is missing.
 * Mapped to HTTP 503 by the simplify route — never expose the env name to clients
 * beyond a generic configuration message.
 */
export class AiNotConfiguredError extends Error {
  readonly code = "AI_NOT_CONFIGURED" as const;

  constructor(message = "GROQ_API_KEY is not configured") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

/**
 * Resolve GROQ_API_KEY from the environment.
 * @throws {AiNotConfiguredError} when unset or empty
 */
export function requireGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new AiNotConfiguredError();
  }
  return key;
}

/**
 * Default simplify model using the package-level `groq` provider
 * (reads GROQ_API_KEY from the environment automatically).
 */
export const simplifyModel = groq(SIMPLIFY_MODEL_ID);

export type CreateSimplifyModelOptions = {
  apiKey?: string;
  /** Custom fetch for tests / interception. */
  fetch?: typeof globalThis.fetch;
};

/**
 * Build a simplify LanguageModel with optional injected credentials / fetch.
 * Prefer this in tests; production routes may use {@link simplifyModel}.
 *
 * Complexity: O(1).
 */
export function createSimplifyModel(
  options: CreateSimplifyModelOptions = {},
): SimplifyLanguageModel {
  const apiKey = options.apiKey ?? requireGroqApiKey();
  const provider = createGroq({
    apiKey,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  return provider(SIMPLIFY_MODEL_ID);
}
