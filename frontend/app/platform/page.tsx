"use client";

import Link from "next/link";
import { Building2, Library, ScrollText, Users } from "lucide-react";
import { PageHeader } from "../../components/app/PageHeader";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/EmptyState";
import { MiniTable } from "../../components/ui/Tabs";
import { usePlatform } from "../../lib/platform";
import { formatRelative, humanize } from "../../lib/format";

type Overview = {
  tenants: number; activeTenants: number; suspendedTenants: number; users: number;
  operators: number; memberships: number; projects: number; auditEntries: number;
  plans: { plan: string; count: number }[];
};

type AuditRow = {
  id: string; scope: string; action: string; entityType: string; actor: string; at: string;
};

const SHORTCUTS = [
  { title: "Companies", copy: "Suspend, reactivate, change plan or open a support session.", href: "/platform/tenants", icon: Building2 },
  { title: "Users", copy: "Unlock accounts, revoke sessions, grant platform roles.", href: "/platform/users", icon: Users },
  { title: "Cost library", copy: "The shared Ghanaian rates every company falls back to.", href: "/platform/prices", icon: Library },
  { title: "Audit log", copy: "Search every action across every company.", href: "/platform/audit", icon: ScrollText }
];

export default function PlatformOverviewPage() {
  const { data, loading, error, refresh } = usePlatform<Overview>("overview");
  const { data: audit } = usePlatform<{ rows: AuditRow[] }>("audit?size=8&scope=PLATFORM");

  if (error) {
    return <Card><ErrorState title="The console could not load." message={error} onRetry={refresh} /></Card>;
  }

  const kpis = [
    ["Companies", data?.tenants, `${data?.activeTenants ?? 0} active · ${data?.suspendedTenants ?? 0} suspended`],
    ["Users", data?.users, `${data?.operators ?? 0} platform operators`],
    ["Memberships", data?.memberships, "company access grants"],
    ["Projects", data?.projects, "across every company"],
    ["Audit entries", data?.auditEntries, "immutable records"],
  ] as const;

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every company on the platform, the people who can reach them, and what has been done."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([label, value, foot]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            {loading ? <Skeleton className="mt-2 h-7 w-20" />
              : <p className="num mt-1 text-3xl font-semibold">{value ?? 0}</p>}
            <p className="mt-0.5 text-xs text-muted">{foot}</p>
          </Card>
        ))}
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card>
          <CardHeader title="Companies by plan" />
          <MiniTable
            head={["Plan", "Companies"]}
            rows={(data?.plans ?? []).map((row) => [row.plan, String(row.count)])}
            empty="No companies yet."
          />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent operator actions"
            subtitle="Platform-scope audit entries"
            action={<Link href="/platform/audit" className="text-sm font-medium text-accent hover:underline">Full log</Link>}
          />
          <MiniTable
            head={["Action", "Entity", "Operator", "When"]}
            rows={(audit?.rows ?? []).map((row) => [
              <Badge key={row.id} tone="brand">{humanize(row.action)}</Badge>,
              row.entityType,
              row.actor ?? "—",
              formatRelative(row.at)
            ])}
            empty="No operator actions recorded yet."
          />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.title}
              href={shortcut.href}
              className="rounded-lg border border-hairline bg-surface p-4 transition-colors hover:border-strongline hover:bg-sunken/40"
            >
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-2 text-base font-semibold">{shortcut.title}</p>
              <p className="mt-1 text-sm text-muted">{shortcut.copy}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
