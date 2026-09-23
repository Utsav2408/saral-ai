/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SESSION_STORAGE_KEY } from "@/lib/constants";

const replace = vi.fn();
const router = { replace };
const fetchActivityOnce = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/client/fetch-activity", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/client/fetch-activity")>();
  return {
    ...actual,
    fetchActivityOnce: (...args: unknown[]) => fetchActivityOnce(...args),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(LocaleProvider, null, children);
}

afterEach(async () => {
  sessionStorage.clear();
  replace.mockReset();
  fetchActivityOnce.mockReset();
  const { clearActivityInFlightForTests } = await import(
    "@/lib/client/use-activity-load"
  );
  clearActivityInFlightForTests();
});

describe("useActivityLoad", () => {
  it("redirects home when session token is missing", async () => {
    const { useActivityLoad } = await import("@/lib/client/use-activity-load");
    renderHook(() => useActivityLoad("simplify", "fallback"), { wrapper });
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(fetchActivityOnce).not.toHaveBeenCalled();
  });

  it("loads data and validates via schema option", async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "a".repeat(43));
    fetchActivityOnce.mockResolvedValue({
      ok: true,
      data: {
        token: "a".repeat(43),
        title: "Lease",
        clauses: [{ id: "c-1", index: 1, text: "Rent." }],
        simplifiedClauses: [
          { clauseId: "c-1", simpleText: "Pay rent.", entityCheckPassed: true },
        ],
        cached: false,
      },
    });

    const { useActivityLoad } = await import("@/lib/client/use-activity-load");
    const { result } = renderHook(
      () => useActivityLoad("simplify", "Could not simplify."),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data?.title).toBe("Lease");
    expect(result.current.error).toBeNull();
    expect(fetchActivityOnce).toHaveBeenCalledWith(
      expect.stringContaining("/simplify"),
      "Could not simplify.",
      expect.objectContaining({
        schema: expect.anything(),
        body: { locale: "en" },
      }),
    );
  });

  it("dedupes concurrent mounts onto one fetchActivityOnce call", async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "a".repeat(43));
    let resolveFetch!: (value: unknown) => void;
    fetchActivityOnce.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { useActivityLoad } = await import("@/lib/client/use-activity-load");
    const first = renderHook(() => useActivityLoad("options", "fallback"), {
      wrapper,
    });
    const second = renderHook(() => useActivityLoad("options", "fallback"), {
      wrapper,
    });

    expect(fetchActivityOnce).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      data: {
        token: "a".repeat(43),
        title: "Lease",
        escalation: false,
        reraChecks: [],
        steps: [],
        regime: {
          state: "Maharashtra",
          category: "residential_rent",
          code: "rent_control",
          label: "MRCA",
        },
        cached: false,
      },
    });

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
      expect(second.result.current.loading).toBe(false);
    });
    expect(fetchActivityOnce).toHaveBeenCalledTimes(1);
  });

  it("clears token and redirects on expired session", async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "a".repeat(43));
    fetchActivityOnce.mockResolvedValue({
      ok: false,
      status: 404,
      message: "gone",
      expired: true,
    });

    const { useActivityLoad } = await import("@/lib/client/use-activity-load");
    renderHook(() => useActivityLoad("summary", "fallback"), { wrapper });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/?reason=expired");
    });
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("surfaces errors and retries", async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "a".repeat(43));
    fetchActivityOnce.mockResolvedValue({
      ok: false,
      status: 502,
      message: "failed",
      expired: false,
    });

    const { useActivityLoad } = await import("@/lib/client/use-activity-load");
    const { result } = renderHook(
      () => useActivityLoad("summary", "fallback"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).toBe("failed");
    });

    fetchActivityOnce.mockResolvedValue({
      ok: true,
      data: {
        token: "a".repeat(43),
        title: "Lease",
        facts: {},
        flags: [],
        flagDescriptions: [],
        checklist: [],
        overview: "ok",
        cached: false,
      },
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.data?.overview).toBe("ok");
      expect(result.current.error).toBeNull();
    });
  });
});
