"use client";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read/write list filters in the query string (?search=&category=...).
 * Components using this must sit inside <Suspense> (useSearchParams).
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(() => {
    const out = {} as Record<K, string>;
    for (const k of keys) out[k] = searchParams.get(k) ?? "";
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setFilter = useCallback((key: K, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  /** Only the non-empty filters, ready to pass as API params. */
  const apiParams = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of keys) if (values[k]) out[k] = values[k];
    return out;
  }, [keys, values]);

  return { values, setFilter, apiParams };
}
