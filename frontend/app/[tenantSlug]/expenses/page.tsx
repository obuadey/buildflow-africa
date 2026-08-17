"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, FileText, Plus, ReceiptText, Upload } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { CategoryBars } from "../../../components/ui/Charts";
import { Drawer } from "../../../components/ui/Overlay";
import { deleteRecord, patchRecord, uploadForm, useList } from "../../../lib/client";
import { formatDate, formatMoney, humanize } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Expense, Project } from "../../../lib/types";

const CATEGORIES = ["MATERIALS", "LABOUR", "EQUIPMENT", "TRANSPORT", "SUBCONTRACTOR", "FUEL", "SITE", "MISC"];

export default function ExpensesPage() {
  const { tenant } = useTenantContext();
  const search = useSearchParams();
  const state = useListState({}, "spentOn");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [duplicate, setDuplicate] = useState<Expense | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Expense>("expenses", state.params);
  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const { rows: allExpenses } = useList<Expense>("expenses", { size: 500 });
  const createInitialValues = {
    projectId: search.get("project") ?? "",
    date: new Date().toISOString().slice(0, 10)
  };

  const byCategory = CATEGORIES.map((category) => ({
    name: humanize(category),
    value: allExpenses.filter((e) => e.category === category).reduce((s, e) => s + e.amount, 0)
  })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  const columns: Column<Expense>[] = [
    { key: "spentOn", header: "Date", sortable: true, hideable: false, render: (e) => formatDate(e.date), csv: (e) => e.date },
    { key: "reference", header: "Reference", sortable: true, render: (e) => <button type="button" onClick={() => setViewing(e)} className="num font-medium hover:text-accent">{e.reference}</button> },
    { key: "vendor", header: "Vendor", sortable: true },
    { key: "projectName", header: "Project", render: (e) => (
      e.projectId ? <Link href={tenantPath(tenant.slug, `/projects/${e.projectId}`)} className="block max-w-[200px] truncate text-muted hover:text-accent">{e.projectName}</Link> : <span className="text-muted">Unassigned</span>
    ) },
    { key: "category", header: "Category", render: (e) => humanize(e.category) },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (e) => formatMoney(e.amount, tenant.currency, 0) },
    { key: "receipt", header: "Receipt", render: (e) => (e.receipt ? <Badge tone={e.hasReceiptFile ? "success" : "info"}>{e.hasReceiptFile ? "File attached" : "Marked"}</Badge> : <Badge tone="warning">Missing</Badge>) },
    { key: "recordedBy", header: "Recorded by", defaultHidden: true },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (e) => (
        <RowActions
          label={e.vendor}
          onView={() => setViewing(e)}
          onEdit={() => setEditing(e)}
          onDuplicate={() => setDuplicate(e)}
          actions={[
            {
              label: "Upload receipt",
              icon: Upload,
              onClick: () => uploadReceipt(e)
            },
            ...(e.receipt ? [{
              label: "Download receipt",
              icon: Download,
              onClick: () => { window.location.href = `/api/t/${tenant.slug}/expenses/${e.id}/receipt`; }
            }] : []),
            {
              label: e.receipt ? "Mark receipt missing" : "Mark receipt attached",
              icon: ReceiptText,
              onClick: async () => {
                await patchRecord(tenant.slug, "expenses", e.id, { receipt: !e.receipt, projectId: e.projectId });
                refresh();
              }
            }
          ]}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "expenses", e.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activeExpense = editing ?? duplicate;

  function uploadReceipt(expense: Expense) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.set("file", file);
      await uploadForm(`/api/t/${tenant.slug}/expenses/${expense.id}/receipt`, form);
      refresh();
    };
    input.click();
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Site spending by project and category. Actual cost feeds project profitability."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Record expense</Button>}
      />

      <div className="mb-3 grid gap-3 xl:grid-cols-3">
        <Card className="px-4 py-3">
          <p className="label-micro">Recorded (filtered)</p>
          <p className="num mt-1 text-3xl font-semibold">{formatMoney(rows.reduce((s, e) => s + e.amount, 0), tenant.currency, 0)}</p>
          <p className="num mt-0.5 text-xs text-muted">{rows.filter((e) => !e.receipt).length} without a receipt</p>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Spend by category" subtitle="All recorded expenses" />
          <div className="p-2">
            <CategoryBars data={byCategory} currency={tenant.currency} height={190} />
          </div>
        </Card>
      </div>

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search vendors, projects…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "category", label: "Category", options: optionsFrom(CATEGORIES) },
          { key: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.name })) }
        ]}
      />

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
        selectable
        exportName="expenses"
        empty={{
          title: "No expenses recorded",
          description: "Log site spending so project profitability reflects real cost.",
          action: <Button variant="primary" onClick={() => setCreating(true)}>Record expense</Button>
        }}
      />

      <CreateRecordDrawer
        open={creating || Boolean(activeExpense)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="expenses"
        title={editing ? "Edit expense" : duplicate ? "Duplicate expense" : "Record expense"}
        recordId={editing?.id}
        initialValues={(activeExpense as Record<string, unknown> | undefined) ?? (creating ? createInitialValues : undefined)}
        onCreated={refresh}
        fields={[
          { name: "projectId", label: "Project", type: "select", required: true, options: projects.map((p) => ({ value: p.id, label: p.name })), full: true },
          { name: "vendor", label: "Vendor", required: true, placeholder: "Tema Building Supplies" },
          { name: "category", label: "Category", type: "select", defaultValue: "MATERIALS", options: optionsFrom(CATEGORIES) },
          { name: "amount", label: "Amount", type: "number", required: true, placeholder: "0.00" },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "recordedBy", label: "Recorded by", defaultValue: "Obed Buadey" },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Receipt number, tax notes or site context", full: true }
        ]}
      />

      <ExpenseDrawer
        expense={viewing}
        currency={tenant.currency}
        tenantSlug={tenant.slug}
        onClose={() => setViewing(null)}
        onEdit={(expense) => { setViewing(null); setEditing(expense); }}
        onUpload={uploadReceipt}
      />
    </>
  );
}

function ExpenseDrawer({
  expense, currency, tenantSlug, onClose, onEdit, onUpload
}: {
  expense: Expense | null;
  currency: string;
  tenantSlug: string;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onUpload: (expense: Expense) => void;
}) {
  if (!expense) return null;
  return (
    <Drawer open={Boolean(expense)} onClose={onClose} title={expense.reference} subtitle={expense.vendor || "Expense"} width="max-w-lg">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Detail label="Amount" value={formatMoney(expense.amount, currency, 0)} strong />
          <Detail label="Date" value={formatDate(expense.date)} />
          <Detail label="Category" value={humanize(expense.category)} />
          <Detail label="Receipt" value={expense.receipt ? (expense.hasReceiptFile ? "File attached" : "Marked attached") : "Missing"} />
        </div>
        <div className="rounded-lg border border-hairline p-3">
          <p className="label-micro">Project</p>
          {expense.projectId ? (
            <Link href={tenantPath(tenantSlug, `/projects/${expense.projectId}`)} className="mt-1 block font-medium hover:text-accent">{expense.projectName}</Link>
          ) : <p className="mt-1 text-sm text-muted">Unassigned</p>}
        </div>
        {expense.notes ? (
          <div className="rounded-lg border border-hairline p-3">
            <p className="label-micro">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{expense.notes}</p>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => onEdit(expense)}><FileText className="h-4 w-4" /> Edit details</Button>
          <Button onClick={() => onUpload(expense)}><Upload className="h-4 w-4" /> Upload receipt</Button>
          {expense.receipt ? (
            <Button className="sm:col-span-2" onClick={() => { window.location.href = `/api/t/${tenantSlug}/expenses/${expense.id}/receipt`; }}>
              <Download className="h-4 w-4" /> Download receipt
            </Button>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-hairline p-3">
      <p className="label-micro">{label}</p>
      <p className={`mt-1 ${strong ? "num text-lg font-semibold" : "text-sm text-muted"}`}>{value}</p>
    </div>
  );
}
