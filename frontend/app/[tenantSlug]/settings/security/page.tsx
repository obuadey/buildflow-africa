"use client";

import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { useSettings } from "../../../../components/app/useSettings";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Field, Input, Toggle } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { MiniTable } from "../../../../components/ui/Tabs";
import { useList } from "../../../../lib/client";
import { formatRelative } from "../../../../lib/format";
import type { Activity } from "../../../../lib/types";

export default function SecuritySettingsPage() {
  const { tenant, user } = useTenantContext();
  const { data, save, saving, saved } = useSettings();
  const [mfa, setMfa] = useState(true);
  const [ipLock, setIpLock] = useState(false);
  const [ipRanges, setIpRanges] = useState("");
  const { rows: activity } = useList<Activity>("activity", { size: 10 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setMfa(data.security.mfaRequired);
    setIpLock(data.security.ipRestrictionEnabled);
    setIpRanges(data.security.allowedIpRanges ?? "");
  }, [data]);

  async function revokeOthers() {
    setBusy(true);
    const response = await fetch(`/api/t/${tenant.slug}/sessions/revoke-others`, { method: "POST" });
    setBusy(false);
    setNotice(response.ok
      ? "Other devices have been signed out. This one stays signed in."
      : "Those sessions could not be revoked.");
  }

  if (!data) return <Card className="p-6"><SkeletonText lines={6} /></Card>;

  return (
    <>
      <Card>
        <CardHeader title="Access control" subtitle="Tenant isolation is enforced on every request, independently of the URL." />
        <ul className="divide-y divide-hairline">
          <li className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-base font-medium">Multi-factor authentication</p>
              <p className="text-sm text-muted">Require a second factor for owners and administrators.</p>
            </div>
            <Toggle checked={mfa} onChange={setMfa} label="Multi-factor authentication" />
          </li>
          <li className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium">Restrict sign-in by IP range</p>
              <p className="text-sm text-muted">Limit access to your office network.</p>
              {ipLock ? (
                <Field label="Allowed IP ranges" className="mt-3 max-w-xl">
                  <Input
                    value={ipRanges}
                    onChange={(e) => setIpRanges(e.target.value)}
                    placeholder="197.255.0.0/16, 102.176.12.4"
                  />
                </Field>
              ) : null}
            </div>
            <Toggle checked={ipLock} onChange={setIpLock} label="Restrict sign-in by IP range" />
          </li>
          <li className="flex items-center justify-end gap-3 px-4 py-3">
            {saved ? <span className="flex items-center gap-1 text-sm text-success" role="status"><Check className="h-4 w-4" /> Saved</span> : null}
            <Button
              variant="primary"
              disabled={saving}
              onClick={() => save({ security: { mfaRequired: mfa, ipRestrictionEnabled: ipLock, allowedIpRanges: ipRanges } })}
            >
              {saving ? "Saving..." : "Save security"}
            </Button>
          </li>
          <li className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-base font-medium">Active sessions</p>
              <p className="text-sm text-muted">{user.email} · this device</p>
            </div>
            <span className="flex flex-col items-end gap-1">
              <Button onClick={revokeOthers} disabled={busy}>
                {busy ? "Signing out…" : "Sign out other devices"}
              </Button>
              {notice ? <span className="text-xs text-muted" role="status">{notice}</span> : null}
            </span>
          </li>
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Tenant isolation"
          subtitle={`Requests are scoped to ${tenant.name} after membership is verified server-side.`}
          action={<ShieldCheck className="h-4 w-4 text-success" />}
        />
        <ul className="space-y-1.5 px-4 py-3 text-sm text-muted">
          <li>· The slug in the address bar identifies a company; it never authorises access.</li>
          <li>· Every API route re-resolves the tenant from the authenticated principal.</li>
          <li>· Requests for a company you do not belong to return 403 with no data.</li>
          <li>· Public quotation links use opaque tokens with no tenant or database identifiers.</li>
        </ul>
      </Card>

      <Card>
        <CardHeader title="Recent audit events" />
        <MiniTable
          head={["Event", "When"]}
          rows={activity.map((a) => [a.text, formatRelative(a.at)])}
        />
      </Card>
    </>
  );
}
