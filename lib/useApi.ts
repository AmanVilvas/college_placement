/**
 * useApi — thin SWR-like hooks that fetch from the existing /api/[resource] route.
 * Works with Supabase when configured; pages that still use dummy data can call
 * fallback helpers that read localStorage (unchanged behaviour for demo mode).
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiResource<T = unknown[]>(
  resource: string,
  params: Record<string, string> = {},
  options: { enabled?: boolean; fallback?: T } = {}
): ApiState<T> & { refetch: () => void } {
  const { enabled = true, fallback = null } = options;
  const [state, setState] = useState<ApiState<T>>({
    data: fallback as T | null,
    loading: enabled,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const requestHeaders = () => typeof window !== "undefined" && window.location.pathname.startsWith("/admin")
    ? { "x-placement-admin-preview": "1" }
    : undefined;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const qs = new URLSearchParams(params).toString();
      const url = `/api/${resource}${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { signal: ctrl.signal, headers: requestHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setState({ data: body.data as T, loading: false, error: null });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      // If backend isn't configured, fall back to provided fallback silently
      const msg = (err as Error).message ?? "Failed to load";
      const isConfig = msg.includes("not configured") || msg.includes("401") || msg.includes("403");
      if (isConfig && fallback !== null) {
        setState({ data: fallback as T, loading: false, error: null });
      } else {
        setState((s) => ({ ...s, loading: false, error: msg }));
      }
    }
  }, [resource, JSON.stringify(params), enabled]); // eslint-disable-line

  useEffect(() => {
    // Start after the effect commits so fetchData's loading update does not
    // synchronously schedule another render from inside the effect itself.
    const timeout = window.setTimeout(() => { void fetchData(); }, 0);
    return () => {
      window.clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/** Generic single mutation helper */
export async function apiMutate<T = unknown>(
  method: "POST" | "PATCH" | "DELETE",
  resource: string,
  body?: unknown
): Promise<T> {
  const resourcePath = resource.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`/api/${resourcePath}`, {
    method,
    headers: { "Content-Type": "application/json", ...(typeof window !== "undefined" && window.location.pathname.startsWith("/admin") ? { "x-placement-admin-preview": "1" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.data as T;
}

/** Specialized import call */
export async function importStudents(rows: Record<string, unknown>[]): Promise<{
  successCount: number;
  errorCount: number;
  results: { roll_number: string; status: string; error?: string }[];
}> {
  const res = await fetch("/api/import/students", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(typeof window !== "undefined" && window.location.pathname.startsWith("/admin") ? { "x-placement-admin-preview": "1" } : {}) },
    body: JSON.stringify({ rows }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
