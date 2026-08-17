"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { deleteRecord, useList } from "../../../lib/client";
import { formatDate, formatMoney, humanize } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Invoice, Payment, Project } from "../../../lib/types";

const METHODS = ["BANK_TRANSFER", "MOBILE_MONEY", "CASH", "CHEQUE", "CARD", "OTHER"];

export default function PaymentsPage() {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const projectId = search.get("project") ?? "";
  const state = useListState({ project: projectId }, "paidOn");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [editing, setEditing] = useState<Payment | null>(null);
  const [duplicate, setDuplicate] = useState<Payment | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Payment>("payments", state.params);
  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const { rows: invoices } = useList<Invoice>("invoices", { size: 100, project: state.filters.project || undefined });
  const createInitialValues = {
    invoiceId: invoices[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10)
  };

  const received = rows.reduce((s, p) => s + p.amount, 0);

  const columns: Column<Payment>[] = [
    { key: "reference", header: "Reference", sortable: true, hideable: false, render: (p) => <span className="num font-medium">{p.reference}</span> },
    { key: "clientName", header: "Client" },
    { key: "invoiceId", header: "Invoice", render: (p) => <span className="num">{p.invoiceNumber ?? "—"}</span> },
    { key: "projectName", header: "Project", render: (p) => <span className="block max-w-[200px] truncate text-muted">{p.projectName}</span> },
    { key: "method", header: "Method", render: (p) => humanize(p.method) },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (p) => formatMoney(p.amount, tenant.currency, 0) },
    { key: "paidOn", header: "Date", sortable: true, render: (p) => formatDate(p.date), csv: (p) => p.date },
    { key: "recordedBy", header: "Recorded by", sortable: true, defaultHidden: true },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (p) => (
        <RowActions
          label={p.reference}
          onView={() => router.push(path(`/invoices/${p.invoiceId}`))}
          onEdit={() => setEditing(p)}
          onDuplicate={() => setDuplicate(p)}
          deleteLabel="Reverse payment"
          deleteConfirm={`Reverse ${p.reference}? The payment will be removed and the invoice balance recalculated.`}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "payments", p.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activePayment = editing ?? duplicate;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every receipt against an invoice, including partial payments and Mobile Money."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Record payment</Button>}
      />

      <Card className="mb-3 px-4 py-3">
        <p className="label-micro">Received (filtered)</p>
        <p className="num mt-1 text-3xl font-semibold">{formatMoney(received, tenant.currency, 0)}</p>
      </Card>

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search references, clients, projects…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "method", label: "Method", options: optionsFrom(METHODS) },
          { key: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.name })) }
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(p) => p.id}
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
        exportName="payments"
        empty={{
          title: "No payments recorded",
          description: "Record a receipt against an invoice to start tracking collections.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>Record payment</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activePayment)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="payments"
        title={editing ? "Edit payment" : duplicate ? "Duplicate payment" : "Record payment"}
        recordId={editing?.id}
        initialValues={(activePayment as Record<string, unknown> | undefined) ?? (creating ? createInitialValues : undefined)}
        onCreated={refresh}
        fields={[
          { name: "invoiceId", label: "Invoice", type: "select", required: true, options: invoices.map((i) => ({ value: i.id, label: `${i.reference}  ${i.clientName}` })), full: true },
          { name: "amount", label: "Amount", type: "number", required: true, placeholder: "0.00" },
          { name: "method", label: "Method", type: "select", defaultValue: "BANK_TRANSFER", options: optionsFrom(METHODS) },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "reference", label: "Reference", placeholder: "MOMO-482913" },
          { name: "recordedBy", label: "Recorded by", defaultValue: "Obed Buadey" }
        ]}
      />
    </>
  );
}
