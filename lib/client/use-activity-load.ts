/**
 * Shared client hook for one-shot activity POST loads (Simplify / Summary / Options).
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  fetchActivityOnce,
  sessionExpiredHomeHref,
} from "@/lib/client/fetch-activity";
import { SESSION_STORAGE_KEY } from "@/lib/constants";

export type ActivityLoadState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
};

/**
 * Load a POST activity endpoint once the session token is present.
 * Handles expiry redirect and Retry via a bump counter.
 */
export function useActivityLoad<T>(
  activityPath: "simplify" | "summary" | "options",
  fallback: string,
): ActivityLoadState<T> {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await fetchActivityOnce<T>(
        `/api/session/${encodeURIComponent(token)}/${activityPath}`,
        fallback,
      );
      if (cancelled) return;
      if (!result.ok) {
        if (result.expired) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          router.replace(sessionExpiredHomeHref());
          return;
        }
        setError(result.message);
        setLoading(false);
        return;
      }
      setData(result.data);
      setError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, retryKey, activityPath, fallback]);

  const retry = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  return { data, error, loading, retry };
}
