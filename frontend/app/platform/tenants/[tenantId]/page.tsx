"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, KeyRound, PauseCircle, PlayCircle } from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Modal } from "../../../../components/ui/Overlay";
import { Field, Input, Select, Toggle } from "../../../../components/ui/Field";
import { MiniTable } from "../../../../components/ui/Tabs";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { ErrorState } from "../../../../components/ui/EmptyState";
import { platformPost, usePlatform } from "../../../../lib/platform";
import { formatDate, formatRelative, humanize } from "../../../../lib/format";

type Detail = {
  tenant: {
    id: string; slug: string; name: string; region: string; city: string; plan: string;
    status: string; suspendedReason: string | null; members: number; projects: number;
    invoices: number; createdAt: string;
  };
  members: { userId: string; name: string; email: string; role: string; status: string; lastLogin: string | null }[];
  flags: { code: string; description: string | null; enabled: boolean }[];
};

export default function PlatformTenantPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data, loading, error, refresh } = usePlatform<Detail>(`tenants/${tenantId}`);
  const [suspending, setSuspending] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) return <Card className="p-6"><SkeletonText lines={7} /></Card>;
  if (error || !data) return <Card><ErrorState message={error ?? undefined} onRetry={refresh} /></Card>;

  const tenant = data.tenant;

  async function act(path: string, body?: unknown) {
    setBusy(true);
    try {
      const result = await platformPost<{ message?: string; tenantSlug?: string }>(path, body);
      setNotice(result.message ?? "Done.");
      setSuspending(false);
      setImpersonating(false);
      refresh();
    } catch (problem) {
      setNotice((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/platform/tenants" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> Companies
      </Link>

      <PageHeader
        className="mt-4"
        title={tenant.name}
        meta={<Badge tone={tenant.status === "ACTIVE" ? "success" : "danger"}>{tenant.status.toLowerCase()}</Badge>}
        description={<><span className="num">/{tenant.slug}</span> · {tenant.city}, {tenant.region} · created {formatDate(tenant.createdAt)}</>}
        actions={
          <>
            <Button onClick={() => setImpersonating(true)}><KeyRound className="h-4 w-4" /> Support access</Button>
            {tenant.status === "ACTIVE" ? (
              <Button variant="danger" onClick={() => setSuspending(true)}><PauseCircle className="h-4 w-4" /> Suspend</Button>
            ) : (
              <Button variant="primary" onClick={() => act(`tenants/${tenantId}/reactivate`)} disabled={busy}>
                <PlayCircle className="h-4 w-4" /> Reactivate
              </Button>
            )}
          </>
        }
      />

      {notice ? (
        <p role="status" className="mb-3 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      ) : null}
      {tenant.suspendedReason ? (
        <p className="mb-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
          Suspended: {tenant.suspendedReason}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-4">
        {[["Plan", tenant.plan], ["Members", String(tenant.members)],
          ["Projects", String(tenant.projects)], ["Invoices", String(tenant.invoices)]].map(([label, value]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            <p className="num mt-1 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader title="Plan" subtitle="Applied from the next billing run" />
          <div className="flex items-center gap-2 p-4">
            <Select
              defaultValue={tenant.plan}
              aria-label="Plan"
              onChange={(event) => act(`tenants/${tenantId}/plan`, { plan: event.target.value })}
              className="w-auto"
            >
              {["Trial", "Starter", "Business", "Enterprise"].map((plan) => <option key={plan}>{plan}</option>)}
            </Select>
            <span className="text-sm text-muted">Changing the plan is recorded in the audit trail.</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Feature flags" subtitle="Overrides the global default for this company" />
          <ul className="divide-y divide-hairline">
            {data.flags.map((flag) => (
              <li key={flag.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span>
                  <span className="num block text-sm font-medium">{flag.code}</span>
                  <span className="block text-xs text-muted">{flag.description ?? ""}</span>
                </span>
                <Toggle
                  checked={flag.enabled}
                  label={flag.code}
                  onChange={(enabled) => act(`tenants/${tenantId}/flags/${flag.code}`, { enabled })}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader title="People with access" subtitle={`${data.members.length} memberships`} />
        <MiniTable
          head={["Name", "Email", "Role", "Status", "Last sign-in"]}
          rows={data.members.map((member) => [
            member.name, member.email, humanize(member.role),
            <Badge key={member.userId} tone={member.status === "ACTIVE" ? "success" : "neutral"}>
              {member.status.toLowerCase()}
            </Badge>,
            member.lastLogin ? formatRelative(member.lastLogin) : "never"
          ])}
          empty="Nobody has access to this company."
        />
      </Card>

      <Modal
        open={suspending}
        onClose={() => setSuspending(false)}
        title="Suspend this company"
        description="Members keep their accounts but cannot open the workspace until it is reactivated."
      >
        <form onSubmit={(event) => {
          event.preventDefault();
          act(`tenants/${tenantId}/suspend`, { reason: String(new FormData(event.currentTarget).get("reason")) });
        }} className="space-y-3">
          <Field label="Reason" required hint="recorded in the audit trail">
            <Input name="reason" required placeholder="Non-payment after three reminders" data-autofocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSuspending(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={busy}>Suspend company</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={impersonating}
        onClose={() => setImpersonating(false)}
        title="Open a support session"
        description="Grants you read-only access to this company for 30 minutes. The reason is recorded before access is issued."
      >
        <form onSubmit={(event) => {
          event.preventDefault();
          act(`tenants/${tenantId}/impersonate`, { reason: String(new FormData(event.currentTarget).get("reason")) });
        }} className="space-y-3">
          <Field label="Reason for access" required>
            <Input name="reason" required placeholder="Ticket 412 — invoice total disputed" data-autofocus />
          </Field>
          <p className="text-sm text-muted">
            After confirming, open <span className="num">/{tenant.slug}/dashboard</span>. End the session from
            this page when you are finished.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => act(`tenants/${tenantId}/end-impersonation`)}>
              End existing session
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>Grant access</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
