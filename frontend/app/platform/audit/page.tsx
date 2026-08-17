"use client";

import { useState } from "react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input, Select } from "../../../components/ui/Field";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/EmptyState";
import { usePlatform } from "../../../lib/platform";
import { formatRelative, humanize } from "../../../lib/format";
import { useDebounced, downloadCsv, toCsv } from "../../../lib/client";

type AuditRow = {
  id: string; scope: string; tenantId: string | null; action: string; entityType: string;
  entityId: string | null; actor: string | null; previousValues: string | null;
  newValues: string | null; ipAddress: string | null; at: string;
};

export default function PlatformAuditPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = useDebounced(query, 220);
  const { data, loading, error, refresh } = usePlatform<{ rows: AuditRow[]; total: number; pages: number }>(
    `audit?q=${encodeURIComponent(q)}&scope=${scope}&page=${page}&size=50`
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every recorded action across every company. Entries are immutable — they are never edited or deleted."
        actions={
          <Button
            onClick={() => downloadCsv("audit-log.csv", toCsv((data?.rows ?? []) as unknown as Record<string, unknown>[], [
              { key: "at", label: "When" }, { key: "scope", label: "Scope" }, { key: "action", label: "Action" },
              { key: "entityType", label: "Entity" }, { key: "actor", label: "Actor" }, { key: "ipAddress", label: "IP" }
            ]))}
            disabled={!data?.rows?.length}
          >
            Export page
          </Button>
        }
      />

      <Card className="mb-3 flex flex-wrap items-center gap-2 p-2">
        <Input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Search action, entity or operator…"
          aria-label="Search audit log"
          className="min-w-[240px] flex-1"
        />
        <Select value={scope} onChange={(event) => { setScope(event.target.value); setPage(1); }} aria-label="Scope" className="w-auto">
          <option value="">All scopes</option>
          <option value="TENANT">Company actions</option>
          <option value="PLATFORM">Operator actions</option>
        </Select>
        <span className="num ml-auto text-sm text-muted">{data?.total ?? 0} entries</span>
      </Card>

      <Card className="overflow-hidden">
        {error ? <ErrorState message={error} onRetry={refresh} /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  {["When", "Scope", "Action", "Entity", "Actor", "IP"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wider text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows rows={10} cols={6} /> : (data?.rows ?? []).map((row) => (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      className="cursor-pointer border-b border-hairline last:border-0 hover:bg-sunken/60"
                    >
                      <td className="num px-3 py-2.5 text-sm">{formatRelative(row.at)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={row.scope === "PLATFORM" ? "brand" : "neutral"}>{row.scope.toLowerCase()}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium">{humanize(row.action)}</td>
                      <td className="px-3 py-2.5 text-sm text-muted">{row.entityType}</td>
                      <td className="px-3 py-2.5 text-sm">{row.actor ?? "system"}</td>
                      <td className="num px-3 py-2.5 text-sm text-muted">{row.ipAddress ?? "—"}</td>
                    </tr>
                    {expanded === row.id && (row.previousValues || row.newValues) ? (
                      <tr key={`${row.id}-detail`} className="border-b border-hairline bg-sunken/40">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="label-micro mb-1">Before</p>
                              <pre className="num overflow-x-auto rounded border border-hairline bg-surface p-2 text-xs">
                                {row.previousValues ?? "—"}
                              </pre>
                            </div>
                            <div>
                              <p className="label-micro mb-1">After</p>
                              <pre className="num overflow-x-auto rounded border border-hairline bg-surface p-2 text-xs">
                                {row.newValues ?? "—"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                ))}
                {!loading && !(data?.rows ?? []).length ? (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-muted">No entries match that search.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        {(data?.pages ?? 1) > 1 ? (
          <div className="flex items-center justify-between border-t border-hairline px-3 py-2">
            <p className="num text-sm text-muted">Page {page} of {data?.pages}</p>
            <span className="flex gap-1.5">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button size="sm" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </span>
          </div>
        ) : null}
      </Card>
    </>
  );
}
