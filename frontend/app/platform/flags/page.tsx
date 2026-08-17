"use client";

import { useState } from "react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Toggle } from "../../../components/ui/Field";
import { SkeletonText } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/EmptyState";
import { platformPost, usePlatform } from "../../../lib/platform";

type Flag = { id: string; code: string; description: string | null; enabledGlobally: boolean };

export default function PlatformFlagsPage() {
  const { data, loading, error, refresh } = usePlatform<Flag[]>("flags");
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(code: string, enabled: boolean) {
    setBusy(code);
    await platformPost(`flags/${code}`, { enabled }, "PATCH").catch(() => undefined);
    setBusy(null);
    refresh();
  }

  if (loading) return <Card className="p-6"><SkeletonText lines={6} /></Card>;
  if (error) return <Card><ErrorState message={error} onRetry={refresh} /></Card>;

  return (
    <>
      <PageHeader
        title="Feature flags"
        description="The global default for each capability. A company can override any of these from its own page."
      />
      <Card>
        <CardHeader title="Global defaults" subtitle="Changes are recorded in the audit trail" />
        <ul className="divide-y divide-hairline">
          {(data ?? []).map((flag) => (
            <li key={flag.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="num text-base font-medium">{flag.code}</p>
                <p className="text-sm text-muted">{flag.description ?? "No description recorded."}</p>
              </div>
              <Toggle
                checked={flag.enabledGlobally}
                label={flag.code}
                onChange={(enabled) => toggle(flag.code, enabled)}
              />
            </li>
          ))}
        </ul>
        {busy ? <p className="border-t border-hairline px-4 py-2 text-sm text-muted">Saving {busy}…</p> : null}
      </Card>
    </>
  );
}
