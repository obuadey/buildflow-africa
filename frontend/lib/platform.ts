"use client";

import { useCallback, useEffect, useState } from "react";

/** Client for the operator console. Every call goes through the platform proxy. */
export type PlatformRole = "PLATFORM_SUPPORT" | "PLATFORM_ADMIN" | "PLATFORM_OWNER";

export type Operator = { id: string; email: string; name: string; platformRole: PlatformRole };

export async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/platform/${path}`, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? "That request failed."), { status: response.status });
  }
  return response.json() as Promise<T>;
}

export async function platformPost<T>(path: string, body?: unknown, method: "POST" | "PATCH" = "POST") {
  return platformFetch<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
}

export async function platformDelete<T>(path: string) {
  return platformFetch<T>(path, { method: "DELETE" });
}

export function usePlatform<T>(path: string, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    platformFetch<T>(path)
      .then((body) => { if (!cancelled) { setData(body); setError(null); } })
      .catch((problem: Error) => { if (!cancelled) setError(problem.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path, enabled, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  return { data, error, loading, refresh };
}
