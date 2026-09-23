/**
 * Prompt addenda so Simplify / Chat answer in the user's UI locale.
 */

import type { Locale } from "@/lib/i18n/locale";

/** Extra system rules when the user wants Hindi GenAI output. */
export const HINDI_OUTPUT_RULES = `
Language:
- Write every user-facing paraphrase or answer in clear Hindi (Devanagari script).
- Keep numbers, currency amounts, dates, percentages, section ids, and proper names exactly as in the source (Latin digits and Latin names are fine).
- Do not translate citation ids or statute chunk ids.
- Legal terms may keep a short English word in parentheses when it helps clarity.`;

/**
 * Append locale rules to a base system prompt.
 * English is a no-op so existing prompts stay unchanged.
 */
export function withLocaleSystemPrompt(
  base: string,
  locale: Locale,
): string {
  if (locale === "hi") {
    return `${base}${HINDI_OUTPUT_RULES}`;
  }
  return base;
}

/**
 * Extra line for the simplify user prompt when asking for Hindi.
 */
export function simplifyLocaleInstruction(locale: Locale): string {
  if (locale === "hi") {
    return " Write each simple_text paraphrase in clear Hindi (Devanagari).";
  }
  return "";
}
