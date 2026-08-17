"use client";

import { useState } from "react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { FilterBar } from "../../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../../components/app/useListState";
import { DataTable, type Column } from "../../../../components/ui/DataTable";
import { Badge } from "../../../../components/ui/Badge";
import { Modal } from "../../../../components/ui/Overlay";
import { Button } from "../../../../components/ui/Button";
import { useList } from "../../../../lib/client";
import { formatRelative, humanize } from "../../../../lib/format";

type AuditRow = {
  id: string; action: string; entityType: string; entityId: string | null; actor: string | null;
  previousValues: string | null; newValues: string | null; ipAddress: string | null; at: string;
};

const ACTIONS = ["PAYMENT_RECORDED", "VARIATION_APPROVED", "TENANT_SUSPENDED", "TENANT_PLAN_CHANGED", "AI_SCOPE_GENERATED"];

export default function TenantAuditPage() {
  const state = useListState({}, "createdAt");
  const { rows, total, pages, loading, error, refresh } = useList<AuditRow>("audit", state.params);
  const [open, setOpen] = useState<AuditRow | null>(null);

  const columns: Column<AuditRow>[] = [
    { key: "at", header: "When", sortable: true, hideable: false, render: (row) => formatRelative(row.at) },
    { key: "action", header: "Action", render: (row) => <Badge tone="brand">{humanize(row.action)}</Badge> },
    { key: "entityType", header: "Record", render: (row) => <span className="text-muted">{row.entityType}</span> },
    { key: "actor", header: "Who", render: (row) => row.actor ?? "system" },
    { key: "ipAddress", header: "From", render: (row) => <span className="num">{row.ipAddress ?? "—"}</span>, defaultHidden: true },
    {
      key: "detail", header: "", align: "right", hideable: false,
      render: (row) => <Button size="sm" onClick={() => setOpen(row)}>View change</Button>
    }
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who changed what, and when. Entries are written automatically and can never be edited or deleted."
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search actions, records or people…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[{ key: "action", label: "Action", options: optionsFrom(ACTIONS) }]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={refresh}
        total={total}
        page={state.page}
        pages={pages}
        onPage={state.setPage}
        sort={state.sort}
        dir={state.dir}
        onSort={state.onSort}
        exportName="audit-log"
        empty={{
          title: "No audit entries yet",
          description: "Recording starts as soon as money moves: payments, variations and contract changes."
        }}
      />

      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? humanize(open.action) : "Change"}
        description={open ? `${open.entityType} · ${formatRelative(open.at)} · ${open.actor ?? "system"}` : ""}
        width="max-w-2xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="label-micro mb-1">Before</p>
            <pre className="num overflow-x-auto rounded border border-hairline bg-sunken p-3 text-xs">
              {open?.previousValues ?? "—"}
            </pre>
          </div>
          <div>
            <p className="label-micro mb-1">After</p>
            <pre className="num overflow-x-auto rounded border border-hairline bg-sunken p-3 text-xs">
              {open?.newValues ?? "—"}
            </pre>
          </div>
        </div>
      </Modal>
    </>
  );
}
