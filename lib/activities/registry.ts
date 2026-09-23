/**
 * Single registry for Clarity activities — ids, UI cards, locks, rate-limit copy.
 * Add a new cached mode here first, then wire route + lib/ai + page.
 */

import {
  chatLock,
  optionsLock,
  simplifyLock,
  summaryLock,
  type TokenLock,
} from "@/lib/ai/token-lock";

/** Allowlisted activity names for structured GenAI / session logs. */
export const CLARITY_ACTIVITIES = [
  "upload",
  "session_get",
  "simplify",
  "chat",
  "summary",
  "options",
] as const;

export type ClarityActivity = (typeof CLARITY_ACTIVITIES)[number];

/** One-shot POST activities that cache on the session (not Chat). */
export const CACHED_ACTIVITY_IDS = ["simplify", "summary", "options"] as const;

export type CachedActivityId = (typeof CACHED_ACTIVITY_IDS)[number];

export type OverviewActivityCard = {
  id: "chat" | CachedActivityId;
  href: string;
  title: string;
  description: string;
};

/** Overview grid — order is display order. */
export const OVERVIEW_ACTIVITY_CARDS: readonly OverviewActivityCard[] = [
  {
    id: "chat",
    href: "/chat",
    title: "Chat with it",
    description: "Ask anything about your lease.",
  },
  {
    id: "simplify",
    href: "/simplify",
    title: "Simplify it",
    description: "Plain language, clause by clause.",
  },
  {
    id: "summary",
    href: "/summary",
    title: "Summary & checklist",
    description: "Key facts, flags, to-dos.",
  },
  {
    id: "options",
    href: "/options",
    title: "Your options",
    description: "What you can do next.",
  },
] as const;

type CachedActivityDef = {
  id: CachedActivityId;
  /** URL segment under /api/session/[token]/ */
  path: CachedActivityId;
  rateLimitMessage: string;
  lock: TokenLock;
};

export const CACHED_ACTIVITIES: Record<CachedActivityId, CachedActivityDef> = {
  simplify: {
    id: "simplify",
    path: "simplify",
    rateLimitMessage:
      "Simplify is already running or was just requested. Try again shortly.",
    lock: simplifyLock,
  },
  summary: {
    id: "summary",
    path: "summary",
    rateLimitMessage:
      "Summary is already running or was just requested. Try again shortly.",
    lock: summaryLock,
  },
  options: {
    id: "options",
    path: "options",
    rateLimitMessage:
      "Options is already running or was just requested. Try again shortly.",
    lock: optionsLock,
  },
};

/** GenAI activities that use an in-process token lock. */
export const LOCKED_ACTIVITIES = {
  chat: chatLock,
  simplify: simplifyLock,
  summary: summaryLock,
  options: optionsLock,
} as const satisfies Record<"chat" | CachedActivityId, TokenLock>;

export type LockedActivityId = keyof typeof LOCKED_ACTIVITIES;

export function getCachedActivity(id: CachedActivityId): CachedActivityDef {
  return CACHED_ACTIVITIES[id];
}

export function isCachedActivityId(value: string): value is CachedActivityId {
  return (CACHED_ACTIVITY_IDS as readonly string[]).includes(value);
}
