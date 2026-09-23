import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_SESSIONS, SESSION_TTL_MS } from "@/lib/constants";
import { SessionStore } from "@/lib/session/store";

function makeInput(title = "Lease") {
  return {
    title,
    sourceFilename: "lease.txt",
    mimeType: "text/plain",
    rawTextLength: 10,
    clauses: [{ id: "c-1", index: 1, text: "Hello" }],
    facts: { depositAmount: 1000, depositCurrency: "INR" },
  };
}

describe("SessionStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates and retrieves a session", () => {
    const store = new SessionStore();
    const session = store.create(makeInput());
    expect(store.isValidTokenFormat(session.token)).toBe(true);
    expect(store.get(session.token)?.title).toBe("Lease");
    expect(store.toPublic(session).clauseCount).toBe(1);
  });

  it("rejects invalid token formats", () => {
    const store = new SessionStore();
    expect(store.get("../etc/passwd")).toBeUndefined();
    expect(store.get("short")).toBeUndefined();
  });

  it("expires sessions after TTL", () => {
    vi.useFakeTimers();
    const store = new SessionStore();
    const session = store.create(makeInput());
    vi.advanceTimersByTime(SESSION_TTL_MS + 1);
    expect(store.get(session.token)).toBeUndefined();
  });

  it("evicts oldest when at capacity", () => {
    const store = new SessionStore();
    const tokens: string[] = [];
    for (let i = 0; i < MAX_SESSIONS; i++) {
      tokens.push(store.create(makeInput(`t${i}`)).token);
    }
    expect(store.size()).toBe(MAX_SESSIONS);
    const newest = store.create(makeInput("overflow"));
    expect(store.size()).toBe(MAX_SESSIONS);
    expect(store.get(tokens[0]!)).toBeUndefined();
    expect(store.get(newest.token)?.title).toBe("overflow");
  });

  it("delete and clear work", () => {
    const store = new SessionStore();
    const session = store.create(makeInput());
    expect(store.delete(session.token)).toBe(true);
    expect(store.get(session.token)).toBeUndefined();
    store.create(makeInput());
    store.clear();
    expect(store.size()).toBe(0);
  });

  it("updates simplify cache fields without changing createdAt", () => {
    const store = new SessionStore();
    const session = store.create(makeInput());
    const createdAt = session.createdAt;
    const updated = store.update(session.token, {
      simplifiedClauses: [
        {
          clauseId: "c-1",
          simpleText: "Hello in plain language.",
          entityCheckPassed: true,
        },
      ],
      simplifyCachedAt: Date.now(),
    });
    expect(updated?.createdAt).toBe(createdAt);
    expect(updated?.simplifiedClauses).toHaveLength(1);
    expect(store.get(session.token)?.simplifiedClauses?.[0]?.simpleText).toBe(
      "Hello in plain language.",
    );
  });

  it("update returns undefined for missing token", () => {
    const store = new SessionStore();
    expect(
      store.update("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
        simplifyCachedAt: 1,
      }),
    ).toBeUndefined();
  });
});
