"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState } from "../../../components/app/useListState";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { deleteRecord, useList } from "../../../lib/client";
import { daysBetween, formatDate, formatMoney } from "../../../lib/format";
import type { LabourRate } from "../../../lib/types";

import { useReference } from "../../../lib/reference";

export default function LabourPage() {
  const reference = useReference();
  const { tenant } = useTenantContext();
  const state = useListState({}, "trade");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LabourRate | null>(null);
  const [duplicate, setDuplicate] = useState<LabourRate | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<LabourRate>("labour", state.params);

  const columns: Column<LabourRate>[] = [
    { key: "trade", header: "Trade", sortable: true, hideable: false, render: (l) => <span className="font-medium">{l.trade}</span> },
    { key: "rate", header: "Rate", align: "right", sortable: true, render: (l) => formatMoney(l.rate, tenant.currency) },
    { key: "unit", header: "Per", render: (l) => l.unit },
    { key: "crewSize", header: "Typical crew", align: "right", sortable: true },
    { key: "region", header: "Region", sortable: true },
    {
      key: "updatedAt", header: "Last updated", sortable: true,
      render: (l) => {
        const age = daysBetween(l.updatedAt);
        return (
          <span className="flex items-center gap-2">
            <Badge tone={age > 60 ? "danger" : age > 30 ? "warning" : "success"}>{age > 30 ? `${Math.round(age)} days old` : "Current"}</Badge>
            <span className="num text-xs text-subtle">{formatDate(l.updatedAt)}</span>
          </span>
        );
      }
    },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (l) => (
        <RowActions
          label={l.trade}
          onEdit={() => setEditing(l)}
          onDuplicate={() => setDuplicate(l)}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "labour", l.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activeRate = editing ?? duplicate;

  return (
    <>
      <PageHeader
        title="Labour rates"
        description="Trade rates per day, hour, square metre or lump sum  used directly by the estimate builder."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add rate</Button>}
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search trades…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[{ key: "region", label: "Region", options: reference.regions.map((r: string) => ({ value: r, label: r })) }]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(l) => l.id}
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
        exportName="labour-rates"
        empty={{
          title: "No labour rates yet",
          description: "Add the trades you employ so estimates price labour correctly.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>Add rate</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activeRate)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="labour"
        title={editing ? "Edit labour rate" : duplicate ? "Duplicate labour rate" : "Add labour rate"}
        recordId={editing?.id}
        initialValues={activeRate as Record<string, unknown> | undefined}
        onCreated={refresh}
        fields={[
          { name: "trade", label: "Trade", required: true, placeholder: "Mason" },
          { name: "rate", label: "Rate", type: "number", required: true, placeholder: "0.00" },
          { name: "unit", label: "Per", type: "select", defaultValue: "day", options: reference.units.map((u: string) => ({ value: u, label: u })) },
          { name: "crewSize", label: "Typical crew size", type: "number", defaultValue: "2" },
          { name: "region", label: "Region", type: "select", defaultValue: tenant.region, options: reference.regions.map((r: string) => ({ value: r, label: r })) },
          { name: "updatedAt", label: "Effective date", type: "date" }
        ]}
      />
    </>
  );
}
