"use client";

import { useEffect, useState } from "react";
import { Check, PlugZap } from "lucide-react";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Field, Input, Toggle } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";

type FieldDef = { key: string; label: string; placeholder: string; secret: boolean };
type Integration = {
  provider: string;
  name: string;
  detail: string;
  enabled: boolean;
  fields: FieldDef[];
  config: Record<string, string>;
};

export default function IntegrationsSettingsPage() {
  const { tenant } = useTenantContext();
  const [items, setItems] = useState<Integration[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/t/${tenant.slug}/integrations`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then(setItems)
      .catch(() => setItems([]));
  }, [tenant.slug]);

  async function saveIntegration(provider: string, form: HTMLFormElement, enabled: boolean) {
    const config = Object.fromEntries(new FormData(form).entries());
    setBusy(provider);
    setError(null);
    const response = await fetch(`/api/t/${tenant.slug}/integrations/${provider}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, config })
    });
    setBusy(null);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      setError(problem.message ?? "The integration could not be saved.");
      return;
    }
    setSaved(provider);
    setTimeout(() => setSaved(null), 2200);
    setItems((current) => current?.map((item) => item.provider === provider ? { ...item, enabled } : item) ?? null);
  }

  if (!items) return <Card className="p-6"><SkeletonText lines={8} /></Card>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <IntegrationCard
          key={item.provider}
          item={item}
          busy={busy === item.provider}
          saved={saved === item.provider}
          onSave={saveIntegration}
        />
      ))}
      {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {!items.length ? (
        <Card className="p-6 text-center text-sm text-muted">No integrations are available for this company.</Card>
      ) : null}
    </div>
  );
}

function IntegrationCard({
  item,
  busy,
  saved,
  onSave
}: {
  item: Integration;
  busy: boolean;
  saved: boolean;
  onSave: (provider: string, form: HTMLFormElement, enabled: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(item.enabled);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(item.provider, e.currentTarget, enabled);
      }}
    >
      <Card>
        <CardHeader
          title={item.name}
          subtitle={item.detail}
          action={<Toggle checked={enabled} onChange={setEnabled} label={`${item.name} enabled`} />}
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {item.fields.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input
                name={field.key}
                type={field.secret ? "password" : "text"}
                defaultValue={item.config[field.key] ?? ""}
                placeholder={field.placeholder}
                autoComplete="off"
              />
            </Field>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-muted">
            <PlugZap className="h-4 w-4" />
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <span className="flex items-center gap-3">
            {saved ? <span className="flex items-center gap-1 text-sm text-success" role="status"><Check className="h-4 w-4" /> Saved</span> : null}
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving..." : "Save integration"}</Button>
          </span>
        </div>
      </Card>
    </form>
  );
}
