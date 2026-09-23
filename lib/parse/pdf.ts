import { extractText } from "unpdf";
import { MAX_TEXT_CHARS } from "@/lib/constants";

export type TextExtractResult = {
  text: string;
  truncated: boolean;
};

/**
 * Extract plain text from a PDF buffer in memory (no disk I/O).
 * Caps output length to MAX_TEXT_CHARS to mitigate text bombs.
 * Complexity: dominated by PDF parse cost; output truncated to O(MAX_TEXT_CHARS).
 *
 * @throws Error with message suitable for mapping to HTTP 422 on encrypted/unreadable PDFs
 */
export async function extractPdfText(
  buffer: Buffer,
): Promise<TextExtractResult> {
  try {
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8, { mergePages: true });
    const raw = Array.isArray(result.text)
      ? result.text.join("\n")
      : String(result.text ?? "");
    return truncateText(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF parse failed";
    if (/password|encrypt|secure/i.test(message)) {
      throw new Error("PASSWORD_PROTECTED");
    }
    throw new Error("PDF_UNREADABLE");
  }
}

/**
 * Decode a UTF-8 text file buffer and cap length.
 */
export function extractPlainText(buffer: Buffer): TextExtractResult {
  // Reject buffers with many NUL bytes (likely binary mislabeled as text).
  const sample = buffer.subarray(0, Math.min(buffer.length, 8_192));
  let nulCount = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      nulCount++;
    }
  }
  if (nulCount > 8) {
    throw new Error("BINARY_TEXT");
  }

  return truncateText(buffer.toString("utf8"));
}

function truncateText(raw: string): TextExtractResult {
  const normalized = raw.replace(/\0/g, "");
  if (normalized.length <= MAX_TEXT_CHARS) {
    return { text: normalized, truncated: false };
  }
  return {
    text: normalized.slice(0, MAX_TEXT_CHARS),
    truncated: true,
  };
}
