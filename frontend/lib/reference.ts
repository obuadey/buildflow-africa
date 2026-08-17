"use client";

import { useEffect, useState } from "react";
import { useTenantSlug } from "./tenant";

/**
 * Reference data — regions, units, categories, status vocabularies and the role matrix — served by
 * the API so the interface and the backend can never disagree about what a valid value is.
 */
export type Reference = {
  regions: string[];
  units: string[];
  categories: string[];
  costTypes: string[];
  paymentMethods: string[];
  leadStages: string[];
  projectStatuses: string[];
  estimateStatuses: string[];
  quoteStatuses: string[];
  invoiceStatuses: string[];
  invoiceTypes: string[];
  expenseCategories: string[];
  roles: string[];
  permissions: { area: string; roles: string[] }[];
};

const EMPTY: Reference = {
  regions: [], units: [], categories: [], costTypes: [], paymentMethods: [], leadStages: [],
  projectStatuses: [], estimateStatuses: [], quoteStatuses: [], invoiceStatuses: [], invoiceTypes: [],
  expenseCategories: [], roles: [], permissions: []
};

const cache = new Map<string, Reference>();

export function useReference() {
  const slug = useTenantSlug();
  const [data, setData] = useState<Reference>(() => cache.get(slug) ?? EMPTY);
  const [loading, setLoading] = useState(!cache.has(slug));

  useEffect(() => {
    if (!slug || cache.has(slug)) {
      if (cache.has(slug)) setData(cache.get(slug)!);
      return;
    }
    let cancelled = false;
    fetch(`/api/t/${slug}/reference`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Reference | null) => {
        if (!body || cancelled) return;
        cache.set(slug, body);
        setData(body);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [slug]);

  return { ...data, loading };
}

/** Options helper for selects and filters. */
export function options(values: string[]) {
  return values.map((value) => ({
    value,
    label: value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
  }));
}
