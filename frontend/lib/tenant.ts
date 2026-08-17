"use client";

import { useParams } from "next/navigation";

/**
 * Centralised tenant-aware link builder. Every internal link must go through this helper so a
 * tenant identifier can never be dropped from a URL.
 */
export function tenantPath(tenantSlug: string, path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${tenantSlug}${clean === "/" ? "" : clean}`;
}

export function useTenantSlug() {
  const params = useParams<{ tenantSlug: string }>();
  return params?.tenantSlug ?? "";
}

export function useTenantPath() {
  const slug = useTenantSlug();
  return (path: string) => tenantPath(slug, path);
}
