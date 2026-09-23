/**
 * Activity registry — ids, overview cards, cached defs.
 */

import { describe, expect, it } from "vitest";
import {
  CACHED_ACTIVITIES,
  CACHED_ACTIVITY_IDS,
  CLARITY_ACTIVITIES,
  getCachedActivity,
  isCachedActivityId,
  OVERVIEW_ACTIVITY_CARDS,
} from "@/lib/activities/registry";

describe("activity registry", () => {
  it("lists all clarity activities", () => {
    expect(CLARITY_ACTIVITIES).toContain("upload");
    expect(CLARITY_ACTIVITIES).toContain("simplify");
    expect(CLARITY_ACTIVITIES).toContain("chat");
  });

  it("exposes three cached activities with locks and messages", () => {
    expect(CACHED_ACTIVITY_IDS).toEqual(["simplify", "summary", "options"]);
    for (const id of CACHED_ACTIVITY_IDS) {
      const def = getCachedActivity(id);
      expect(def.path).toBe(id);
      expect(def.rateLimitMessage.length).toBeGreaterThan(10);
      expect(typeof def.lock.tryAcquire).toBe("function");
      expect(CACHED_ACTIVITIES[id]).toBe(def);
    }
  });

  it("narrows cached activity ids", () => {
    expect(isCachedActivityId("simplify")).toBe(true);
    expect(isCachedActivityId("chat")).toBe(false);
  });

  it("orders overview cards with chat first", () => {
    expect(OVERVIEW_ACTIVITY_CARDS.map((c) => c.id)).toEqual([
      "chat",
      "simplify",
      "summary",
      "options",
    ]);
    for (const card of OVERVIEW_ACTIVITY_CARDS) {
      expect(card.href.startsWith("/")).toBe(true);
      expect(card.title.length).toBeGreaterThan(0);
    }
  });
});
