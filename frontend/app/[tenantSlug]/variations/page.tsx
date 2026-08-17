"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Plus, Send } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/Badge";
import { deleteRecord, patchRecord, useList } from "../../../lib/client";
import { formatDate, formatMoney } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Project, Variation } from "../../../lib/types";

export default function VariationsPage() {
  const { tenant } = useTenantContext();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState({}, "createdAt");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [editing, setEditing] = useState<Variation | null>(null);
  const [duplicate, setDuplicate] = useState<Variation | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Variation>("variations", state.params);
  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const createInitialValues = { projectId: search.get("project") ?? "" };

  const columns: Column<Variation>[] = [
    { key: "id", header: "Variation", sortable: true, hideable: false, render: (v) => <span className="num font-medium">{v.reference}</span> },
    { key: "projectName", header: "Project", sortable: true, render: (v) => <Link href={path(`/projects/${v.projectId}`)} onClick={(e) => e.stopPropagation()} className="hover:text-accent">{v.projectName}</Link> },
    { key: "title", header: "Change", render: (v) => <span className="block max-w-[280px] truncate">{v.title}</span> },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (v) => formatMoney(v.amount, tenant.currency, 0) },
    { key: "requestedBy", header: "Requested by", sortable: true },
    { key: "createdAt", header: "Raised", sortable: true, render: (v) => formatDate(v.createdAt) },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v.status} /> },
    {
      key: "rowActions", header: "Actions", align: "right", hideable: false,
      render: (v) => (
        <RowActions
          label={v.reference}
          onEdit={v.status === "APPROVED" ? undefined : () => setEditing(v)}
          onDuplicate={() => setDuplicate(v)}
          actions={[
            ...(v.status === "DRAFT" ? [{
              label: "Send for approval",
              icon: Send,
              onClick: async () => { await patchRecord(tenant.slug, "variations", v.id, { status: "SENT" }); refresh(); }
            }] : []),
            ...(["DRAFT", "SENT"].includes(v.status) ? [{
              label: "Approve variation",
              icon: CheckCircle2,
              onClick: async () => { await fetch(`/api/t/${tenant.slug}/variations/${v.id}/approve`, { method: "POST" }); refresh(); }
            }] : [])
          ]}
          onDelete={v.status === "APPROVED" ? undefined : async () => {
            await deleteRecord(tenant.slug, "variations", v.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activeVariation = editing ?? duplicate;
  const variationInitialValues = duplicate ? { ...duplicate, status: "DRAFT" } : editing ?? (creating ? createInitialValues : undefined);

  return (
    <>
      <PageHeader
        title="Variations"
        description="Change orders adjust the contract value without ever overwriting the original quotation."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New variation</Button>}
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search variations…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "status", label: "Status", options: optionsFrom(["DRAFT", "SENT", "APPROVED", "REJECTED"]) },
          { key: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.name })) }
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(v) => v.id}
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
        selectable
        exportName="variations"
        empty={{
          title: "No variations raised",
          description: "Raise a variation when the client changes scope after a quotation is accepted.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>New variation</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activeVariation)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="variations"
        title={editing ? "Edit variation" : duplicate ? "Duplicate variation" : "New variation"}
        subtitle="The original contract value is preserved; approved variations adjust the revised value."
        recordId={editing?.id}
        initialValues={variationInitialValues as Record<string, unknown> | undefined}
        onCreated={refresh}
        fields={[
          { name: "projectId", label: "Project", type: "select", required: true, options: projects.map((p) => ({ value: p.id, label: p.name })), full: true },
          { name: "title", label: "Change description", required: true, placeholder: "Upgrade to porcelain floor tiles", full: true },
          { name: "amount", label: "Variation amount", type: "number", required: true, placeholder: "0.00" },
          { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: optionsFrom(["DRAFT", "SENT", "APPROVED", "REJECTED"]) },
          { name: "requestedBy", label: "Requested by", placeholder: "Client or site team" }
        ]}
      />
    </>
  );
}
