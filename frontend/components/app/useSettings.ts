"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenantSlug } from "../../lib/tenant";

export type Settings = {
  company: { name: string; phone: string; email: string; address: string; region: string; city: string; website: string; tin: string; vatRegistered: boolean };
  defaults: { currency: string; markup: number; overhead: number; profit: number; validityDays: number; paymentTerms: string };
  branding: { accent: string; footer: string; introduction: string; exclusions: string; bank: string; momo: string; logo?: string };
  taxes: { id: string; name: string; rate: number; effectiveFrom: string; appliesTo: string; active: boolean; createdAt: string; updatedAt: string }[];
  numbering: { estimate: string; quotation: string; invoice: string; variation: string; project: string };
  security: { mfaRequired: boolean; ipRestrictionEnabled: boolean; allowedIpRanges: string };
  notifications: Record<string, boolean>;
};

export function activeTaxRates(settings: Settings | null | undefined) {
  return (settings?.taxes ?? []).filter((tax) => tax.active);
}

export function defaultEstimateTaxPct(settings: Settings | null | undefined) {
  const active = activeTaxRates(settings);
  return active.find((tax) => tax.name.toLowerCase() === "vat")?.rate ?? active[0]?.rate ?? 0;
}

export function useSettings() {
  const slug = useTenantSlug();
  const [data, setData] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/t/${slug}/settings`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [slug]);

  const save = useCallback(
    async (patch: Partial<Settings>) => {
      setSaving(true);
      const response = await fetch(`/api/t/${slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (response.ok) {
        setData(await response.json());
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }
      setSaving(false);
      return response.ok;
    },
    [slug]
  );

  return { data, save, saving, saved };
}
