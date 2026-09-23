/**
 * Server-only Groq model wiring for Clarity GenAI activities.
 * Never import this module from client components.
 */

import { createGroq, groq, type GroqProvider } from "@ai-sdk/groq";

/** Language model instance returned by the Groq provider. */
export type ClarityLanguageModel = ReturnType<GroqProvider>;

/** Groq model id used for all Clarity GenAI activities unless overridden. */
const CLARITY_MODEL_ID = "openai/gpt-oss-120b" as const;

/**
 * Typed error when GROQ_API_KEY is missing.
 * Mapped to HTTP 503 by activity routes — never expose the env name to clients
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
 * Default Clarity model using the package-level `groq` provider
 * (reads GROQ_API_KEY from the environment automatically).
 */
export const clarityModel = groq(CLARITY_MODEL_ID);

type CreateClarityModelOptions = {
  apiKey?: string;
  /** Custom fetch for tests / interception. */
  fetch?: typeof globalThis.fetch;
};

/**
 * Build a Clarity LanguageModel with optional injected credentials / fetch.
 * Prefer this in tests; production routes may use {@link clarityModel}.
 *
 * Complexity: O(1).
 */
export function createClarityModel(
  options: CreateClarityModelOptions = {},
): ClarityLanguageModel {
  const apiKey = options.apiKey ?? requireGroqApiKey();
  const provider = createGroq({
    apiKey,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  return provider(CLARITY_MODEL_ID);
}
