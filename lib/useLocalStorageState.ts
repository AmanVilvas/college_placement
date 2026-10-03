"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Update<T> = T | ((previous: T) => T);

/** Browser-only persistence. Values are device-local, not shared or secure storage. */
export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const valueRef = useRef(value);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored !== null) {
          const parsed = JSON.parse(stored) as T;
          valueRef.current = parsed;
          setValue(parsed);
        }
      } catch {
        // Keep the in-memory default if storage is unavailable or malformed.
      }
      setReady(true);
    });
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: unknown }>).detail;
      if (detail?.key === key) {
        valueRef.current = detail.value as T;
        setValue(detail.value as T);
      }
    };
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;
      try {
        const parsed = JSON.parse(event.newValue) as T;
        valueRef.current = parsed;
        setValue(parsed);
      } catch { /* Ignore malformed values written by another tab. */ }
    };
    window.addEventListener("placement-storage-change", sync);
    window.addEventListener("storage", syncAcrossTabs);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("placement-storage-change", sync); window.removeEventListener("storage", syncAcrossTabs); };
  }, [key]);

  const update = useCallback((nextValue: Update<T>) => {
    const next = typeof nextValue === "function"
      ? (nextValue as (previous: T) => T)(valueRef.current)
      : nextValue;
    valueRef.current = next;
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("placement-storage-change", { detail: { key, value: next } }));
    } catch { /* Keep the current session usable. */ }
  }, [key]);

  return [value, update, ready] as const;
}
