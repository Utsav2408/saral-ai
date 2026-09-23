/**
 * Allowlist check for citation URLs shown in Chat.
 * Complexity: O(1).
 */

import { CITATION_URL_ALLOWLIST } from "@/lib/constants";

/**
 * Return the href if the URL is https and host is allowlisted; else null.
 */
export function safeCitationHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!CITATION_URL_ALLOWLIST.has(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
