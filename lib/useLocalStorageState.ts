"use client";

import { useCallback, useEffect, useState } from "react";

type Update<T> = T | ((previous: T) => T);

/** Browser-only persistence for the frontend demo. This is device-local, not shared or secure storage. */
export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored !== null) setValue(JSON.parse(stored) as T);
      } catch {
        // Keep the in-memory default if storage is unavailable or malformed.
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [key]);

  const update = useCallback((nextValue: Update<T>) => {
    setValue((previous) => {
      const next = typeof nextValue === "function"
        ? (nextValue as (previous: T) => T)(previous)
        : nextValue;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the current session usable. */ }
      return next;
    });
  }, [key]);

  return [value, update, ready] as const;
}
