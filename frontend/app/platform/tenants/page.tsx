"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../components/app/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input, Select } from "../../../components/ui/Field";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/EmptyState";
import { usePlatform } from "../../../lib/platform";
import { formatDate } from "../../../lib/format";
import { useDebounced } from "../../../lib/client";

type TenantRow = {
  id: string; slug: string; name: string; region: string; city: string; plan: string;
  status: string; suspendedReason: string | null; members: number; projects: number;
  invoices: number; createdAt: string;
};

export default function PlatformTenantsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounced(query, 220);
  const { data, loading, error, refresh } = usePlatform<{ rows: TenantRow[]; total: number }>(
    `tenants?q=${encodeURIComponent(q)}&status=${status}&size=50`
  );

  return (
    <>
      <PageHeader
        title="Companies"
        description="Every tenant on the platform, with its plan, people and workload."
      />

      <Card className="mb-3 flex flex-wrap items-center gap-2 p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by company name or slug…"
          aria-label="Search companies"
          className="min-w-[220px] flex-1"
        />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status" className="w-auto">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
        <span className="num ml-auto text-sm text-muted">{data?.total ?? 0} companies</span>
      </Card>

      <Card className="overflow-hidden">
        {error ? <ErrorState message={error} onRetry={refresh} /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  {["Company", "Plan", "Status", "Members", "Projects", "Invoices", "Created", ""].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${i > 2 && i < 7 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows rows={6} cols={8} /> : (data?.rows ?? []).map((tenant) => (
                  <tr
                    key={tenant.id}
                    onClick={() => router.push(`/platform/tenants/${tenant.id}`)}
                    className="cursor-pointer border-b border-hairline last:border-0 hover:bg-sunken/60"
                  >
                    <td className="px-3 py-2.5 text-sm">
                      <span className="block font-medium">{tenant.name}</span>
                      <span className="num block text-xs text-subtle">/{tenant.slug} · {tenant.city}, {tenant.region}</span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">{tenant.plan}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={tenant.status === "ACTIVE" ? "success" : "danger"}>{tenant.status.toLowerCase()}</Badge>
                    </td>
                    <td className="num px-3 py-2.5 text-right text-sm">{tenant.members}</td>
                    <td className="num px-3 py-2.5 text-right text-sm">{tenant.projects}</td>
                    <td className="num px-3 py-2.5 text-right text-sm">{tenant.invoices}</td>
                    <td className="num px-3 py-2.5 text-sm">{formatDate(tenant.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" onClick={(event) => { event.stopPropagation(); router.push(`/platform/tenants/${tenant.id}`); }}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && !(data?.rows ?? []).length ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted">No companies match that search.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
