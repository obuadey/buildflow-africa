"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Plus, Send, Wallet } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/Badge";
import { patchRecord, useList } from "../../../lib/client";
import { dueLabel, formatDate, formatMoney } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Client, Invoice, Project } from "../../../lib/types";

const STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const EDITABLE_STATUSES = ["DRAFT", "CANCELLED"];
const TYPES = ["DEPOSIT", "PROGRESS", "MILESTONE", "VARIATION", "FINAL"];
const METHODS = ["BANK_TRANSFER", "MOBILE_MONEY", "CASH", "CHEQUE", "CARD", "OTHER"];

export default function InvoicesPage() {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState({ status: search.get("status") ?? "" }, "dueDate");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [duplicate, setDuplicate] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Invoice>("invoices", state.params);
  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const { rows: clients } = useList<Client>("clients", { size: 100 });
  const initialProject = projects.find((p) => p.id === search.get("project"));
  const createInitialValues = {
    projectId: search.get("project") ?? "",
    clientId: initialProject?.clientId ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  };

  const totals = rows.reduce(
    (acc, i) => ({ total: acc.total + i.total, paid: acc.paid + i.paid, outstanding: acc.outstanding + (i.total - i.paid) }),
    { total: 0, paid: 0, outstanding: 0 }
  );

  const columns: Column<Invoice>[] = [
    { key: "id", header: "Invoice", sortable: true, hideable: false, render: (i) => <span className="num font-medium">{i.reference}</span> },
    { key: "clientName", header: "Client", sortable: true, render: (i) => <span className="block max-w-[150px] truncate">{i.clientName}</span> },
    { key: "projectName", header: "Project", sortable: true, render: (i) => <Link href={path(`/projects/${i.projectId}`)} onClick={(e) => e.stopPropagation()} className="block max-w-[180px] truncate text-muted hover:text-accent">{i.projectName}</Link> },
    { key: "type", header: "Type", render: (i) => <span className="text-muted">{i.type.toLowerCase()}</span>, defaultHidden: true },
    { key: "total", header: "Total", align: "right", sortable: true, render: (i) => formatMoney(i.total, tenant.currency, 0) },
    { key: "paid", header: "Paid", align: "right", sortable: true, render: (i) => formatMoney(i.paid, tenant.currency, 0) },
    {
      key: "outstanding", header: "Outstanding", align: "right",
      render: (i) => <span className={i.total - i.paid > 0 ? "font-medium" : "text-muted"}>{formatMoney(i.total - i.paid, tenant.currency, 0)}</span>,
      csv: (i) => i.total - i.paid
    },
    { key: "dueDate", header: "Due", sortable: true, render: (i) => <span className={i.status === "OVERDUE" ? "text-danger" : ""}>{dueLabel(i.dueDate)}</span> },
    { key: "issueDate", header: "Issued", sortable: true, render: (i) => formatDate(i.issueDate), defaultHidden: true },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (i) => (
        <RowActions
          label={i.reference}
          onView={() => router.push(path(`/invoices/${i.id}`))}
          onEdit={() => setEditing(i)}
          onDuplicate={() => setDuplicate(i)}
          actions={[
            ...(i.status === "DRAFT" ? [{
              label: "Send invoice",
              icon: Send,
              onClick: async () => {
                await fetch(`/api/t/${tenant.slug}/invoices/${i.id}/send`, { method: "POST" });
                refresh();
              }
            }] : []),
            ...(i.status !== "PAID" && i.status !== "CANCELLED" ? [{
              label: "Record payment",
              icon: Wallet,
              onClick: () => setPaying(i)
            }] : []),
            ...(i.status !== "CANCELLED" ? [{
              label: "Cancel invoice",
              icon: Ban,
              danger: true,
              onClick: async () => {
                if (!window.confirm(`Cancel ${i.reference}? This keeps the invoice for audit but removes it from open collections.`)) return;
                await patchRecord(tenant.slug, "invoices", i.id, { status: "CANCELLED" });
                refresh();
              }
            }] : [])
          ]}
        />
      )
    }
  ];

  const activeInvoice = editing ?? duplicate;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Deposit, progress, milestone, variation and final invoices with payment tracking."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New invoice</Button>}
      />

      <section className="mb-3 grid gap-3 sm:grid-cols-3">
        {[
          ["Invoiced", totals.total],
          ["Paid", totals.paid],
          ["Outstanding", totals.outstanding]
        ].map(([label, value]) => (
          <Card key={String(label)} className="px-4 py-3">
            <p className="label-micro">{label} (filtered)</p>
            <p className="num mt-1 text-3xl font-semibold">{formatMoney(value as number, tenant.currency, 0)}</p>
          </Card>
        ))}
      </section>

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search invoices, clients, projects…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "status", label: "Status", options: optionsFrom(STATUSES) },
          { key: "type", label: "Type", options: optionsFrom(TYPES) },
          { key: "client", label: "Client", options: clients.map((c) => ({ value: c.id, label: c.name })) },
          { key: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.name })) }
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(i) => i.id}
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
        onRowClick={(i) => router.push(path(`/invoices/${i.id}`))}
        selectable
        exportName="invoices"
        empty={{
          title: "No invoices yet",
          description: "Raise an invoice from a contract milestone or an approved variation.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>New invoice</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activeInvoice)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="invoices"
        title={editing ? "Edit invoice" : duplicate ? "Duplicate invoice" : "New invoice"}
        recordId={editing?.id}
        initialValues={(activeInvoice as Record<string, unknown> | undefined) ?? (creating ? createInitialValues : undefined)}
        onCreated={refresh}
        fields={[
          { name: "projectId", label: "Project", type: "select", required: true, options: projects.map((p) => ({ value: p.id, label: p.name })), full: true },
          { name: "clientId", label: "Client", type: "select", required: true, options: clients.map((c) => ({ value: c.id, label: c.name })) },
          { name: "type", label: "Invoice type", type: "select", defaultValue: "PROGRESS", options: optionsFrom(TYPES) },
          { name: "total", label: "Amount", type: "number", required: true, placeholder: "0.00" },
          { name: "issueDate", label: "Issue date", type: "date" },
          { name: "dueDate", label: "Due date", type: "date", required: true },
          { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: optionsFrom(EDITABLE_STATUSES) }
        ]}
      />

      <CreateRecordDrawer
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        resource="payments"
        title="Record payment"
        subtitle={paying ? `${paying.reference} outstanding: ${formatMoney(Math.max(0, paying.total - paying.paid), tenant.currency, 0)}` : undefined}
        initialValues={paying ? { invoiceId: paying.id, date: new Date().toISOString().slice(0, 10) } : undefined}
        onCreated={() => { refresh(); setPaying(null); }}
        fields={[
          { name: "invoiceId", label: "Invoice", type: "select", required: true, options: rows.map((i) => ({ value: i.id, label: `${i.reference}  ${i.clientName}` })), full: true },
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
