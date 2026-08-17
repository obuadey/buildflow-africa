"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Check, Copy, FileText, Plus } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { RowActions } from "../../../components/app/RowActions";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { ButtonLink } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/Badge";
import { createRecord, deleteRecord, patchRecord, useList } from "../../../lib/client";
import { formatDate, formatMoney, formatPercent } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Estimate } from "../../../lib/types";

/** Margin on the sell price, from the figures the API already calculated. */
function margin(estimate: Estimate) {
  const subtotal = estimate.total - estimate.tax;
  return subtotal ? ((subtotal - estimate.directCost) / subtotal) * 100 : 0;
}

const STATUSES = ["DRAFT", "READY", "QUOTED", "APPROVED", "REJECTED", "ARCHIVED"];

export default function EstimatesPage() {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState({}, "updatedAt");
  const { rows, total, pages, loading, error, refresh } = useList<Estimate>("estimates", state.params);

  const columns: Column<Estimate>[] = [
    { key: "reference", header: "Estimate", sortable: true, hideable: false, render: (e) => <span className="num font-medium">{e.reference}</span> },
    {
      key: "title", header: "Project", sortable: true,
      render: (e) => e.projectId
        ? <Link href={path(`/projects/${e.projectId}`)} onClick={(event) => event.stopPropagation()} className="block max-w-[220px] truncate hover:text-accent">{e.title}</Link>
        : <span className="block max-w-[220px] truncate">{e.title}</span>
    },
    {
      key: "clientName", header: "Client", sortable: true,
      render: (e) => e.clientId
        ? <Link href={path(`/clients/${e.clientId}`)} onClick={(event) => event.stopPropagation()} className="block max-w-[160px] truncate hover:text-accent">{e.clientName}</Link>
        : <span className="block max-w-[160px] truncate">{e.clientName}</span>
    },
    {
      key: "amount", header: "Amount", align: "right",
      render: (e) => formatMoney(e.total, tenant.currency, 0),
      csv: (e) => e.total
    },
    {
      key: "cost", header: "Cost", align: "right",
      render: (e) => formatMoney(e.directCost, tenant.currency, 0),
      csv: (e) => e.directCost
    },
    {
      key: "margin", header: "Margin", align: "right",
      render: (e) => {
        const m = margin(e);
        return <span className={m < 12 ? "font-medium text-warning" : ""}>{formatPercent(m)}</span>;
      },
      csv: (e) => margin(e)
    },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
    { key: "estimator", header: "Estimator", sortable: true },
    { key: "createdAt", header: "Created", sortable: true, render: (e) => formatDate(e.createdAt), defaultHidden: true },
    { key: "updatedAt", header: "Updated", sortable: true, render: (e) => formatDate(e.updatedAt) },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (e) => (
        <RowActions
          label={e.reference}
          onView={() => router.push(path(`/estimates/${e.id}`))}
          onEdit={() => router.push(path(`/estimates/${e.id}`))}
          onDuplicate={async () => {
            const copy = await createRecord<Estimate>(tenant.slug, "estimates", {
              title: `${e.title} copy`,
              projectId: e.projectId,
              clientId: e.clientId,
              estimator: e.estimator,
              currency: tenant.currency,
              overheadPct: e.overheadPct,
              contingencyPct: e.contingencyPct,
              profitPct: e.profitPct,
              taxPct: e.taxPct,
              discount: e.discount
            });
            router.push(path(`/estimates/${copy.id}`));
          }}
          actions={[
            ...(e.status === "DRAFT" ? [{
              label: "Mark ready",
              icon: Check,
              onClick: async () => { await patchRecord(tenant.slug, "estimates", e.id, { status: "READY" }); refresh(); }
            }] : []),
            ...(e.status === "READY" || e.status === "APPROVED" ? [{
              label: "Create quotation",
              icon: FileText,
              onClick: async () => {
                const quote = await createRecord<{ id: string }>(tenant.slug, "quotations", { estimateId: e.id });
                await patchRecord(tenant.slug, "estimates", e.id, { status: "QUOTED" });
                router.push(path(`/quotations/${quote.id}`));
              }
            }] : []),
            ...(e.status !== "ARCHIVED" ? [{
              label: "Archive",
              icon: Archive,
              onClick: async () => { await patchRecord(tenant.slug, "estimates", e.id, { status: "ARCHIVED" }); refresh(); }
            }] : []),
            ...(e.status === "ARCHIVED" ? [{
              label: "Restore to draft",
              icon: Copy,
              onClick: async () => { await patchRecord(tenant.slug, "estimates", e.id, { status: "DRAFT" }); refresh(); }
            }] : [])
          ]}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "estimates", e.id);
            refresh();
          }}
        />
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Estimates"
        description="Build priced estimates from your own material, labour and equipment rates."
        actions={
          <ButtonLink href={path("/estimates/new")} variant="primary"><Plus className="h-4 w-4" /> New estimate</ButtonLink>
        }
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search estimates, projects, clients…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "status", label: "Status", options: optionsFrom(STATUSES) },
          { key: "estimator", label: "Estimator", options: optionsFrom(Array.from(new Set(rows.map((r) => r.estimator)))) }
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
        onRowClick={(e) => router.push(path(`/estimates/${e.id}`))}
        selectable
        exportName="estimates"
        empty={{
          title: "No estimates yet",
          description: "Start from a template or a blank sheet.",
          action: <ButtonLink variant="primary" href={path("/estimates/new")}>Create estimate</ButtonLink>
        }}
      />
    </>
  );
}
