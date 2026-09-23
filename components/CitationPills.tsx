/**
 * Citation pill list shared by Chat and Options.
 */

import { safeCitationHref } from "@/lib/chat/safe-citation-url";
import type { ChatCitation } from "@/types/session";

type CitationPillsProps = {
  citations: ChatCitation[];
  /** Extra classes on each pill (e.g. chat muted vs options primary). */
  pillClassName?: string;
};

const DEFAULT_PILL =
  "inline-block rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary";

/**
 * Render citation labels as safe external links (or plain spans).
 */
export function CitationPills({
  citations,
  pillClassName = DEFAULT_PILL,
}: CitationPillsProps) {
  if (citations.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {citations.map((c) => {
        const href = safeCitationHref(c.sourceUrl);
        return (
          <li key={c.id}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${pillClassName} underline-offset-2 hover:underline`}
              >
                {c.label}
              </a>
            ) : (
              <span className={pillClassName}>{c.label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
