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
import { deleteRecord, useList } from "../../../lib/client";
import { formatDate, formatMoney } from "../../../lib/format";
import type { Equipment } from "../../../lib/types";

import { useReference } from "../../../lib/reference";

export default function EquipmentPage() {
  const reference = useReference();
  const { tenant } = useTenantContext();
  const state = useListState({}, "name");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [duplicate, setDuplicate] = useState<Equipment | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Equipment>("equipment", state.params);

  const columns: Column<Equipment>[] = [
    { key: "name", header: "Equipment", sortable: true, hideable: false, render: (e) => <span className="font-medium">{e.name}</span> },
    { key: "hireRate", header: "Hire rate", align: "right", sortable: true, render: (e) => formatMoney(e.hireRate, tenant.currency, 0) },
    { key: "unit", header: "Per" },
    { key: "transport", header: "Transport", align: "right", sortable: true, render: (e) => formatMoney(e.transport, tenant.currency, 0) },
    { key: "operatorCost", header: "Operator", align: "right", sortable: true, render: (e) => (e.operatorCost ? formatMoney(e.operatorCost, tenant.currency, 0) : "") },
    {
      key: "allIn", header: "All-in / day", align: "right",
      render: (e) => <span className="font-medium">{formatMoney(e.hireRate + e.operatorCost, tenant.currency, 0)}</span>,
      csv: (e) => e.hireRate + e.operatorCost
    },
    { key: "supplierName", header: "Source", sortable: true },
    { key: "updatedAt", header: "Updated", sortable: true, render: (e) => formatDate(e.updatedAt) },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (e) => (
        <RowActions
          label={e.name}
          onEdit={() => setEditing(e)}
          onDuplicate={() => setDuplicate(e)}
          deleteLabel="Retire"
          deleteConfirm={`Retire ${e.name}? It will no longer appear as an active equipment rate.`}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "equipment", e.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activeEquipment = editing ?? duplicate;

  return (
    <>
      <PageHeader
        title="Equipment"
        description="Plant hire rates including transport and operator cost."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add equipment</Button>}
      />

      <FilterBar query={state.query} onQuery={state.setQuery} placeholder="Search equipment or source..." values={state.filters} onChange={state.setFilter} />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(e) => e.id}
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
        exportName="equipment"
        empty={{
          title: "No equipment yet",
          description: "Add plant and hire rates so equipment cost is never forgotten in an estimate.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>Add equipment</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activeEquipment)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="equipment"
        title={editing ? "Edit equipment" : duplicate ? "Duplicate equipment" : "Add equipment"}
        recordId={editing?.id}
        initialValues={activeEquipment as Record<string, unknown> | undefined}
        onCreated={refresh}
        fields={[
          { name: "name", label: "Equipment", required: true, placeholder: "Concrete mixer 350L", full: true },
          { name: "hireRate", label: "Hire rate", type: "number", required: true },
          { name: "unit", label: "Per", type: "select", defaultValue: "day", options: reference.units.map((u: string) => ({ value: u, label: u })) },
          { name: "transport", label: "Transport cost", type: "number", defaultValue: "0" },
          { name: "operatorCost", label: "Operator cost", type: "number", defaultValue: "0" },
          { name: "supplierName", label: "Source", placeholder: "Internal fleet or hire source" }
        ]}
      />
    </>
  );
}
