/**
 * Process an uploaded lease buffer into text, clauses, and facts.
 */
import { parseClauses } from "@/lib/parse/clauses";
import { extractFacts } from "@/lib/parse/facts";
import { extractPdfText, extractPlainText } from "@/lib/parse/pdf";
import type { Clause, ExtractedFacts } from "@/types/session";

export type ProcessDocumentResult = {
  text: string;
  clauses: Clause[];
  facts: ExtractedFacts;
  truncated: boolean;
};

/**
 * Extract text by MIME, then run clause + fact pipelines.
 * Complexity: O(n) over extracted text after PDF parse.
 */
export async function processDocument(
  buffer: Buffer,
  mime: string,
): Promise<ProcessDocumentResult> {
  const extracted =
    mime === "application/pdf"
      ? await extractPdfText(buffer)
      : extractPlainText(buffer);

  const text = extracted.text.trim();
  if (!text) {
    throw new Error("NO_TEXT");
  }

  const clauses = parseClauses(text);
  const facts = extractFacts(text);

  return {
    text,
    clauses,
    facts,
    truncated: extracted.truncated,
  };
}
