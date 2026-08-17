"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { formatDate, formatMoney } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Client } from "../../../lib/types";

import { useReference } from "../../../lib/reference";

export default function ClientsPage() {
  const reference = useReference();
  const { tenant } = useTenantContext();
  const router = useRouter();
  const search = useSearchParams();
  const state = useListState({}, "name");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [editing, setEditing] = useState<Client | null>(null);
  const [duplicate, setDuplicate] = useState<Client | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Client>("clients", state.params);

  const columns: Column<Client>[] = [
    {
      key: "name", header: "Client", sortable: true, hideable: false,
      render: (c) => (
        <span className="block">
          <span className="block truncate font-medium">{c.name}</span>
          <span className="block text-xs text-subtle">{[c.company, [c.city, c.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</span>
        </span>
      )
    },
    { key: "type", header: "Type", render: (c) => <Badge tone={c.type === "COMPANY" ? "info" : "neutral"}>{c.type === "COMPANY" ? "Company" : "Individual"}</Badge> },
    { key: "phone", header: "Phone", render: (c) => <span className="num">{c.phone}</span> },
    { key: "email", header: "Email", defaultHidden: true },
    { key: "projects", header: "Projects", align: "right" },
    { key: "revenue", header: "Revenue", align: "right", render: (c) => formatMoney(c.revenue, tenant.currency, 0) },
    {
      key: "outstanding", header: "Outstanding", align: "right",
      render: (c) => <span className={c.outstanding > 0 ? "font-medium text-warning" : "text-muted"}>{formatMoney(c.outstanding, tenant.currency, 0)}</span>
    },
    { key: "createdAt", header: "Added", sortable: true, render: (c) => formatDate(c.createdAt), defaultHidden: true },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (c) => (
        <RowActions
          label={c.name}
          onView={() => router.push(tenantPath(tenant.slug, `/clients/${c.id}`))}
          onEdit={() => setEditing(c)}
          onDuplicate={() => setDuplicate(c)}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "clients", c.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activeClient = editing ?? duplicate;

  return (
    <>
      <PageHeader
        title="Clients"
        description="Contacts, project history and outstanding balances for everyone you invoice."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New client</Button>}
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search by name, company, phone or email…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "type", label: "Type", options: [{ value: "INDIVIDUAL", label: "Individual" }, { value: "COMPANY", label: "Company" }] },
          { key: "region", label: "Region", options: reference.regions.map((r: string) => ({ value: r, label: r })) }
        ]}
      />

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
        onRowClick={(c) => router.push(tenantPath(tenant.slug, `/clients/${c.id}`))}
        selectable
        exportName="clients"
        empty={{
          title: "No clients yet",
          description: "Add the people and companies you quote and invoice.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>Add client</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activeClient)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="clients"
        title={editing ? "Edit client" : duplicate ? "Duplicate client" : "New client"}
        recordId={editing?.id}
        initialValues={activeClient as Record<string, unknown> | undefined}
        onCreated={refresh}
        fields={[
          { name: "type", label: "Client type", type: "select", required: true, defaultValue: "INDIVIDUAL", options: [{ value: "INDIVIDUAL", label: "Individual" }, { value: "COMPANY", label: "Company" }] },
          { name: "name", label: "Name", required: true, placeholder: "Nana Mensah" },
          { name: "company", label: "Company name", placeholder: "Adom Properties Ltd", full: true },
          { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "+233 24 000 0000" },
          { name: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+233 24 000 0000" },
          { name: "email", label: "Email", type: "email", placeholder: "name@example.com" },
          { name: "region", label: "Region", type: "select", options: reference.regions.map((r: string) => ({ value: r, label: r })), defaultValue: tenant.region },
          { name: "city", label: "City", placeholder: "Accra" },
          { name: "taxInformation", label: "TIN / VAT number", placeholder: "C00…" },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Preferred contact method, billing instructions…" }
        ]}
      />
    </>
  );
}
