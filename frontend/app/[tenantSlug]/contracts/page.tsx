"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, PauseCircle, PlayCircle, Plus } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { Button } from "../../../components/ui/Button";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Card, CardHeader } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/Badge";
import { Progress } from "../../../components/ui/Misc";
import { createRecord, deleteRecord, postJson, useList } from "../../../lib/client";
import { formatDate, formatMoney, formatPercent } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Contract, Project, Quotation } from "../../../lib/types";

export default function ContractsPage() {
  const { tenant } = useTenantContext();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState({}, "contractNumber");
  const { rows, total, pages, loading, error, refresh } = useList<Contract>("contracts", state.params);
  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const { rows: quotations } = useList<Quotation>("quotations", { size: 100 });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [editing, setEditing] = useState<Contract | null>(null);
  const active = selected ?? rows.find((contract) => contract.id === search.get("selected")) ?? rows[0] ?? null;
  const contractFields = [
    { name: "projectId", label: "Project", type: "select" as const, required: true, options: projects.map((project) => ({ value: project.id, label: project.name })) },
    { name: "quotationId", label: "Linked quotation", type: "select" as const, options: quotations.map((quotation) => ({ value: quotation.id, label: `${quotation.reference} · ${quotation.projectName ?? quotation.clientName}` })) },
    { name: "original", label: "Original value", type: "number" as const, required: true },
    { name: "retentionPct", label: "Retention %", type: "number" as const },
    { name: "startDate", label: "Start date", type: "date" as const },
    { name: "endDate", label: "Completion date", type: "date" as const },
    { name: "status", label: "Status", type: "select" as const, options: optionsFrom(["ACTIVE", "COMPLETED", "SUSPENDED"]) },
    { name: "notes", label: "Notes", type: "textarea" as const, full: true }
  ];

  async function runContractAction(contract: Contract, action: "complete" | "suspend" | "reactivate") {
    try {
      await postJson(`/api/t/${tenant.slug}/contracts/${contract.id}/${action}`, {});
      refresh();
    } catch (err) {
      window.alert((err as { message?: string }).message ?? "The contract action failed.");
    }
  }

  async function duplicateContract(contract: Contract) {
    try {
      await createRecord(tenant.slug, "contracts", {
        projectId: contract.projectId,
        quotationId: contract.quotationId || undefined,
        original: contract.original,
        retentionPct: contract.retentionPct,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: "ACTIVE",
        notes: `Copied from ${contract.reference}`
      });
      refresh();
    } catch (err) {
      window.alert((err as { message?: string }).message ?? "The contract could not be duplicated.");
    }
  }

  async function removeContract(contract: Contract) {
    try {
      await deleteRecord(tenant.slug, "contracts", contract.id);
      setSelected((current) => current?.id === contract.id ? null : current);
      refresh();
    } catch (err) {
      window.alert((err as { message?: string }).message ?? "The contract could not be deleted.");
    }
  }

  const columns: Column<Contract>[] = [
    { key: "id", header: "Contract", sortable: true, hideable: false, render: (c) => <span className="num font-medium">{c.reference}</span> },
    { key: "projectName", header: "Project", sortable: true, render: (c) => <Link href={path(`/projects/${c.projectId}`)} className="hover:text-accent">{c.projectName}</Link> },
    { key: "clientName", header: "Client", sortable: true },
    { key: "original", header: "Original", align: "right", sortable: true, render: (c) => formatMoney(c.original, tenant.currency, 0) },
    { key: "variations", header: "Variations", align: "right", sortable: true, render: (c) => formatMoney(c.variations, tenant.currency, 0) },
    { key: "value", header: "Contract value", align: "right", sortable: true, render: (c) => <span className="font-medium">{formatMoney(c.value, tenant.currency, 0)}</span> },
    { key: "retentionPct", header: "Retention", align: "right", render: (c) => formatPercent(c.retentionPct, 0) },
    { key: "endDate", header: "Completion", sortable: true, render: (c) => formatDate(c.endDate) },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (c) => (
        <RowActions
          label={c.reference}
          onView={() => setSelected(c)}
          onEdit={() => setEditing(c)}
          actions={[
            ...(c.status !== "COMPLETED" ? [{
              label: "Mark completed",
              icon: CheckCircle2,
              onClick: () => runContractAction(c, "complete")
            }] : []),
            ...(c.status !== "SUSPENDED" ? [{
              label: "Suspend",
              icon: PauseCircle,
              danger: true,
              onClick: () => runContractAction(c, "suspend")
            }] : []),
            ...(c.status === "SUSPENDED" ? [{
              label: "Reactivate",
              icon: PlayCircle,
              onClick: () => runContractAction(c, "reactivate")
            }] : []),
            {
              label: "Duplicate",
              icon: Copy,
              onClick: () => duplicateContract(c)
            }
          ]}
          onDelete={() => removeContract(c)}
          deleteConfirm={`Delete ${c.reference}? Contracts with invoices or approved variations cannot be removed.`}
        />
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Signed contract values, approved variations and milestone payment schedules."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New contract
          </Button>
        }
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search contracts, projects, clients…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[{ key: "status", label: "Status", options: optionsFrom(["ACTIVE", "COMPLETED", "SUSPENDED"]) }]}
      />

      <div className={active ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]" : "grid gap-3"}>
        <DataTable
          rows={rows}
          columns={columns}
          getId={(c) => c.id}
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
          onRowClick={setSelected}
          exportName="contracts"
          empty={{ title: "No contracts yet", description: "Accept a quotation to create the first contract." }}
        />

        {active ? (
          <Card className="h-fit">
            <CardHeader title="Payment schedule" subtitle={`${active.id} · ${active.projectName}`} />
            <div className="grid grid-cols-2 gap-3 border-b border-hairline p-4">
              {[
                ["Original", formatMoney(active.original, tenant.currency, 0)],
                ["Approved variations", formatMoney(active.variations, tenant.currency, 0)],
                ["Revised value", formatMoney(active.value, tenant.currency, 0)],
                ["Retention", formatPercent(active.retentionPct, 0)]
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="label-micro">{l}</p>
                  <p className="num mt-0.5 text-base font-semibold">{v}</p>
                </div>
              ))}
            </div>
            {(active.milestones ?? []).length ? (
            <ul className="divide-y divide-hairline">
              {(active.milestones ?? []).map((m) => (
                <li key={m.name} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted">
                    <span className="num">{formatPercent(m.percent, 0)}</span>
                    <span className="num font-medium text-fg">{formatMoney(m.amount, tenant.currency, 0)}</span>
                  </div>
                  <Progress className="mt-1.5" value={m.status === "PAID" ? 100 : m.status === "INVOICED" ? 50 : 0} tone={m.status === "PAID" ? "brand" : "neutral"} />
                </li>
              ))}
            </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted">No payment milestones are attached to this contract yet.</p>
            )}
          </Card>
        ) : null}
      </div>

      <CreateRecordDrawer
        open={creating}
        onClose={() => setCreating(false)}
        resource="contracts"
        title="New contract"
        subtitle="Create a contract against a project and generate the default milestone schedule."
        onCreated={refresh}
        fields={contractFields}
      />

      <CreateRecordDrawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        resource="contracts"
        title="Edit contract"
        recordId={editing?.id}
        initialValues={editing as Record<string, unknown> | undefined}
        onCreated={refresh}
        fields={contractFields}
      />
    </>
  );
}
