/**
 * Allowlist check for citation URLs shown in Chat / Options.
 * Complexity: O(1).
 */

import { CITATION_URL_ALLOWLIST } from "@/lib/constants";

/**
 * Return the href if the URL is https, host is allowlisted, and has no
 * userinfo — else null. Rejects javascript:, http, and hostname confusion.
 */
export function safeCitationHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (!CITATION_URL_ALLOWLIST.has(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
