"use client";
import { useEffect, useRef } from "react";

/**
 * Call `fn` every `intervalMs` while `active` is true (first call right away if `immediate`). `fn` returns true to stop.
 * Stops on unmount; the latest `fn` is always used without restarting the timer.
 */
export function usePolling(fn: () => Promise<boolean | void>, intervalMs: number, active: boolean, immediate = false) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopped) return;
      try {
        if (await fnRef.current()) return;
      } catch {
        // network blip — try again next tick
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    timer = setTimeout(tick, immediate ? 0 : intervalMs);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, intervalMs, immediate]);
}
