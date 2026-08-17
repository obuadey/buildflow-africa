"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTenantSlug } from "./tenant";
import type { CurrentUser, DashboardSummary, SearchGroup, Tenant } from "./types";

export type ApiError = { code: string; message: string; status: number };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: ApiError = { code: body.code ?? "REQUEST_FAILED", message: body.message ?? "The request failed.", status: response.status };
    throw error;
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export type ListResult<T> = { rows: T[]; total: number; page: number; size: number; pages: number; facets?: string[] };

export function useList<T>(resource: string, params: Record<string, string | number | undefined | null> = {}) {
  const slug = useTenantSlug();
  const key = useMemo(() => toQuery(params), [params]);
  const [data, setData] = useState<ListResult<T> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    request<ListResult<T>>(`/api/t/${slug}/${resource}${key}`)
      .then((r) => { setData(r); setError(null); })
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false));
  }, [slug, resource, key, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { rows: data?.rows ?? [], total: data?.total ?? 0, pages: data?.pages ?? 1, page: data?.page ?? 1, facets: data?.facets ?? [], loading, error, refresh };
}

export function useRecord<T>(resource: string, id: string | undefined) {
  const slug = useTenantSlug();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!slug || !id) return;
    setLoading(true);
    request<T>(`/api/t/${slug}/${resource}/${id}`)
      .then((r) => { setData(r); setError(null); })
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false));
  }, [slug, resource, id, nonce]);

  return { data, error, loading, refresh: () => setNonce((n) => n + 1), setData };
}

export function useSummary(range: string, projectId?: string) {
  const slug = useTenantSlug();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    request<DashboardSummary>(`/api/t/${slug}/summary${toQuery({ range, project: projectId })}`)
      .then((r) => { setData(r); setError(null); })
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false));
  }, [slug, range, projectId]);

  return { data, error, loading };
}

export function useSession() {
  const [data, setData] = useState<{ user: CurrentUser; tenants: (Tenant & { role: string })[] } | null>(null);
  useEffect(() => {
    request<{ user: CurrentUser; tenants: (Tenant & { role: string })[] }>("/api/session").then(setData).catch(() => setData(null));
  }, []);
  return data;
}

export function useSearch(query: string, scope: string) {
  const slug = useTenantSlug();
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 160);

  useEffect(() => {
    if (!slug || debounced.trim().length < 2) { setGroups([]); return; }
    setLoading(true);
    request<{ groups: SearchGroup[] }>(`/api/t/${slug}/search${toQuery({ q: debounced, scope })}`)
      .then((r) => setGroups(r.groups))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [slug, debounced, scope]);

  return { groups, loading };
}

export function useDebounced<T>(value: T, ms = 200) {
  const [state, setState] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setState(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return state;
}

export async function createRecord<T>(slug: string, resource: string, body: unknown): Promise<T> {
  return request<T>(`/api/t/${slug}/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function patchRecord<T>(slug: string, resource: string, id: string, body: unknown): Promise<T> {
  return request<T>(`/api/t/${slug}/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deleteRecord(slug: string, resource: string, id: string): Promise<void> {
  await request<void>(`/api/t/${slug}/${resource}/${id}`, { method: "DELETE" });
}

export async function uploadForm<T>(url: string, form: FormData): Promise<T> {
  return request<T>(url, { method: "POST", body: form });
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const head = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((row) => columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
