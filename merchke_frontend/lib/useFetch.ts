"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "./config";

type State<T> = { key: string; data: T; error: string };

/**
 * Fetch data whenever `key` changes (e.g. JSON of the current filters).
 * `loading` is derived from whether the latest result matches the current key,
 * so no state is set synchronously inside the effect.
 */
export function useFetch<T>(fetcher: () => Promise<{ data: T }>, key: string, initial: T, errorMessage?: string) {
  const [nonce, setNonce] = useState(0);
  const requestKey = `${key}#${nonce}`;
  const [state, setState] = useState<State<T>>({ key: "", data: initial, error: "" });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((res) => { if (!cancelled) setState({ key: requestKey, data: res.data, error: "" }); })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ key: requestKey, data: s.data, error: apiErrorMessage(err, errorMessage) }));
      });
    return () => { cancelled = true; };
    // `fetcher` is recreated every render; `requestKey` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const setData = useCallback((update: T | ((prev: T) => T)) => {
    setState((s) => ({ ...s, data: typeof update === "function" ? (update as (prev: T) => T)(s.data) : update }));
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const settled = state.key === requestKey;

  return { data: state.data, setData, loading: !settled, error: settled ? state.error : "", reload };
}
