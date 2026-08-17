"use client";

import { PageHeader } from "../../../components/app/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { MiniTable } from "../../../components/ui/Tabs";
import { SkeletonText } from "../../../components/ui/Skeleton";
import { usePlatform } from "../../../lib/platform";
import { formatRelative } from "../../../lib/format";

type Impersonation = {
  id: string; adminUserId: string; tenantId: string; reason: string;
  startedAt: string; expiresAt: string; endedAt: string | null;
};

type Overview = { tenants: number; users: number; auditEntries: number };

export default function PlatformHealthPage() {
  const { data: overview, loading } = usePlatform<Overview>("overview");
  const { data: sessions } = usePlatform<Impersonation[]>("impersonations");

  const services = [
    ["API", "Reachable — this page loaded through it", overview ? "up" : "unknown"],
    ["Database", "Serving platform queries", overview ? "up" : "unknown"],
    ["Audit trail", `${overview?.auditEntries ?? 0} entries recorded`, overview ? "up" : "unknown"],
  ] as const;

  return (
    <>
      <PageHeader
        title="System health"
        description="Service reachability and the record of support access into customer companies."
      />

      {loading ? <Card className="p-6"><SkeletonText lines={4} /></Card> : (
        <section className="grid gap-3 sm:grid-cols-3">
          {services.map(([name, detail, status]) => (
            <Card key={name} className="px-4 py-3">
              <span className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold">{name}</p>
                <Badge tone={status === "up" ? "success" : "warning"}>{status}</Badge>
              </span>
              <p className="mt-1 text-sm text-muted">{detail}</p>
            </Card>
          ))}
        </section>
      )}

      <Card className="mt-3">
        <CardHeader
          title="Support access sessions"
          subtitle="Every impersonation is time-boxed to 30 minutes and recorded before access is granted"
        />
        <MiniTable
          head={["Reason", "Started", "Expires", "Ended"]}
          rows={(sessions ?? []).map((session) => [
            session.reason,
            formatRelative(session.startedAt),
            formatRelative(session.expiresAt),
            session.endedAt ? formatRelative(session.endedAt) : "open"
          ])}
          empty="No support session has been opened."
        />
      </Card>

      <Card className="mt-3">
        <CardHeader title="Operational checks" subtitle="Verified manually until monitoring is wired" />
        <ul className="divide-y divide-hairline text-sm">
          {[
            ["Database migrations", "Flyway V1–V7 applied on start; the application refuses to boot on a failed migration."],
            ["Object storage", "Files are written under a per-company prefix; keys that escape it are rejected."],
            ["AI service", "Answers without a provider key using deterministic logic, so an outage degrades rather than fails."],
            ["Backups", "Nightly dump with 30-day retention; restore rehearsed quarterly."],
          ].map(([title, detail]) => (
            <li key={title} className="px-4 py-3">
              <p className="font-medium">{title}</p>
              <p className="mt-0.5 text-muted">{detail}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
