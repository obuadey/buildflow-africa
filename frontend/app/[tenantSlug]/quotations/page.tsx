"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { RowActions } from "../../../components/app/RowActions";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { ButtonLink } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/Badge";
import { createRecord, patchRecord, useList } from "../../../lib/client";
import { formatDate, formatMoney, formatRelative } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Quotation } from "../../../lib/types";
import { Check, Copy, FileSignature, Send, X } from "lucide-react";

const STATUSES = ["DRAFT", "SENT", "VIEWED", "NEGOTIATING", "ACCEPTED", "REJECTED", "EXPIRED"];

export default function QuotationsPage() {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState({ status: search.get("status") ?? "" }, "createdAt");
  const { rows, total, pages, loading, error, refresh } = useList<Quotation>("quotations", state.params);

  const columns: Column<Quotation>[] = [
    { key: "id", header: "Quote", sortable: true, hideable: false, render: (q) => <span className="num font-medium">{q.reference}<span className="ml-1 text-xs text-subtle">v{q.version}</span></span> },
    { key: "clientName", header: "Client", sortable: true, render: (q) => <span className="block max-w-[160px] truncate">{q.clientName}</span> },
    { key: "projectName", header: "Project", sortable: true, render: (q) => <span className="block max-w-[200px] truncate text-muted">{q.projectName}</span> },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (q) => formatMoney(q.amount, tenant.currency, 0) },
    {
      key: "margin", header: "Margin", align: "right",
      render: (q) => <span className={q.amount && (q.amount - q.cost) / q.amount < 0.12 ? "text-warning" : ""}>{q.amount ? `${(((q.amount - q.cost) / q.amount) * 100).toFixed(1)}%` : ""}</span>,
      defaultHidden: true,
      csv: (q) => (q.amount ? ((q.amount - q.cost) / q.amount) * 100 : 0)
    },
    { key: "status", header: "Status", render: (q) => <StatusBadge status={q.status} /> },
    { key: "sentAt", header: "Sent", sortable: true, render: (q) => (q.sentAt ? formatDate(q.sentAt) : "") },
    { key: "viewedAt", header: "Viewed", render: (q) => (q.viewedAt ? `${formatRelative(q.viewedAt)} · ${q.views}×` : "Not opened") },
    { key: "expiry", header: "Expiry", sortable: true, render: (q) => formatDate(q.expiry) },
    { key: "owner", header: "Owner", sortable: true, defaultHidden: true },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (q) => (
        <RowActions
          label={q.reference}
          onView={() => router.push(path(`/quotations/${q.id}`))}
          actions={[
            ...(q.status === "DRAFT" ? [{
              label: "Send to client",
              icon: Send,
              onClick: async () => { await patchRecord(tenant.slug, "quotations", q.id, { status: "SENT" }); refresh(); }
            }] : []),
            ...(["SENT", "VIEWED", "NEGOTIATING"].includes(q.status) ? [{
              label: "Mark accepted",
              icon: Check,
              onClick: async () => { await patchRecord(tenant.slug, "quotations", q.id, { status: "ACCEPTED" }); refresh(); }
            }, {
              label: "Mark rejected",
              icon: X,
              danger: true,
              onClick: async () => { await patchRecord(tenant.slug, "quotations", q.id, { status: "REJECTED" }); refresh(); }
            }] : []),
            ...(q.status === "ACCEPTED" ? [{
              label: "Create contract",
              icon: FileSignature,
              onClick: async () => {
                const contract = await createRecord<{ id: string }>(tenant.slug, "contracts", {
                  projectId: q.projectId,
                  quotationId: q.id,
                  original: q.amount,
                  startDate: new Date().toISOString().slice(0, 10),
                  endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
                });
                router.push(path(`/contracts?selected=${contract.id}`));
              }
            }] : []),
            ...(q.status !== "DRAFT" ? [{
              label: "Create revision",
              icon: Copy,
              onClick: async () => { await patchRecord(tenant.slug, "quotations", q.id, { status: "DRAFT" }); refresh(); }
            }] : [])
          ]}
        />
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Issued documents, client engagement and decisions. Every version is preserved."
        actions={<ButtonLink variant="primary" href={path("/estimates")}>Quote from an estimate</ButtonLink>}
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search quotes, clients, projects…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "status", label: "Status", options: optionsFrom(STATUSES) },
          { key: "owner", label: "Owner", options: optionsFrom(Array.from(new Set(rows.map((r) => r.owner)))) }
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(q) => q.id}
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
        onRowClick={(q) => router.push(path(`/quotations/${q.id}`))}
        selectable
        exportName="quotations"
        empty={{ title: "No quotations yet", description: "Convert a completed estimate into a client-ready quotation." }}
      />
    </>
  );
}
