/**
 * Shared client hook for one-shot activity POST loads (Simplify / Summary / Options).
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useLocale } from "@/components/LocaleProvider";
import {
  getCachedActivity,
  type CachedActivityId,
} from "@/lib/activities/registry";
import {
  fetchActivityOnce,
  sessionExpiredHomeHref,
  type ActivityFetchResult,
} from "@/lib/client/fetch-activity";
import { SESSION_STORAGE_KEY } from "@/lib/constants";
import { CACHED_ACTIVITY_RESPONSE_SCHEMAS } from "@/lib/schemas/session";

export type CachedActivityResponse<A extends CachedActivityId> = z.infer<
  (typeof CACHED_ACTIVITY_RESPONSE_SCHEMAS)[A]
>;

export type ActivityLoadState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
};

/**
 * In-flight POSTs keyed by activity + session + retry + locale.
 * Shared across Strict Mode remounts so the second effect reuses the first promise
 * instead of firing a duplicate request that hits the token lock (429).
 */
const inFlightByKey = new Map<string, Promise<ActivityFetchResult<unknown>>>();

function activityKey(
  activityPath: string,
  token: string,
  retryKey: number,
  locale: string,
): string {
  return `${activityPath}|${token}|${retryKey}|${locale}`;
}

/**
 * Load a POST activity endpoint once the session token is present.
 * Handles expiry redirect and Retry via a bump counter.
 * Success bodies are validated against the activity response schema.
 * Passes the current UI locale so Simplify can regenerate on language switch.
 */
export function useActivityLoad<A extends CachedActivityId>(
  activityPath: A,
  fallback: string,
): ActivityLoadState<CachedActivityResponse<A>> {
  type T = CachedActivityResponse<A>;
  const router = useRouter();
  const { locale } = useLocale();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const localeRef = useRef(locale);

  // Language switch → clear cache UI and re-POST (Simplify is locale-keyed).
  useEffect(() => {
    if (localeRef.current === locale) return;
    localeRef.current = locale;
    setError(null);
    setData(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, [locale]);

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      router.replace("/");
      return;
    }

    const def = getCachedActivity(activityPath);
    const schema = CACHED_ACTIVITY_RESPONSE_SCHEMAS[
      activityPath
    ] as unknown as z.ZodType<T>;
    let cancelled = false;

    const key = activityKey(activityPath, token, retryKey, locale);
    let promise = inFlightByKey.get(key) as
      | Promise<ActivityFetchResult<T>>
      | undefined;
    if (!promise) {
      promise = fetchActivityOnce<T>(
        `/api/session/${encodeURIComponent(token)}/${def.path}`,
        fallback,
        {
          schema,
          ...(activityPath === "simplify" ? { body: { locale } } : {}),
        },
      );
      inFlightByKey.set(key, promise as Promise<ActivityFetchResult<unknown>>);
      void promise.finally(() => {
        if (inFlightByKey.get(key) === promise) {
          inFlightByKey.delete(key);
        }
      });
    }

    (async () => {
      const result = await promise;
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
  }, [router, retryKey, activityPath, fallback, locale]);

  const retry = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  return { data, error, loading, retry };
}

/** Test helper — clear the shared in-flight map between cases. */
export function clearActivityInFlightForTests(): void {
  inFlightByKey.clear();
}
