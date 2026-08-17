"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GripVertical, Plus } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { CreateRecordDrawer } from "../../../components/app/CreateRecordDrawer";
import { RowActions } from "../../../components/app/RowActions";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { SegmentedControl, Select } from "../../../components/ui/Field";
import { StatusBadge } from "../../../components/ui/Badge";
import { Menu, MenuItem, MenuLabel } from "../../../components/ui/Menu";
import { deleteRecord, useList, patchRecord } from "../../../lib/client";
import { formatMoney, formatMoneyCompact, formatRelative } from "../../../lib/format";
import type { Lead, LeadStage } from "../../../lib/types";

const STAGES: LeadStage[] = ["NEW", "CONTACTED", "SITE_VISIT", "ESTIMATING", "QUOTED", "NEGOTIATING", "WON", "LOST"];

import { useReference } from "../../../lib/reference";

export default function LeadsPage() {
  const reference = useReference();
  const { tenant } = useTenantContext();
  const search = useSearchParams();
  const state = useListState({}, "createdAt");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<LeadStage | null>(null);
  const [optimisticStages, setOptimisticStages] = useState<Record<string, LeadStage>>({});
  const [editing, setEditing] = useState<Lead | null>(null);
  const [duplicate, setDuplicate] = useState<Lead | null>(null);
  const { rows, total, pages, loading, error, refresh } = useList<Lead>("leads", { ...state.params, size: view === "pipeline" ? 200 : 25 });
  const leads = rows.map((lead) => ({ ...lead, stage: optimisticStages[lead.id] ?? lead.stage }));

  async function move(lead: Lead, stage: LeadStage) {
    if (lead.stage === stage) return;
    setOptimisticStages((current) => ({ ...current, [lead.id]: stage }));
    await patchRecord(tenant.slug, "leads", lead.id, { stage });
    refresh();
  }

  function onDragStart(event: React.DragEvent, lead: Lead) {
    setDraggingId(lead.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-buildflow-lead", lead.id);
    event.dataTransfer.setData("text/plain", lead.id);
  }

  function onDragOver(event: React.DragEvent, stage: LeadStage) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropStage(stage);
  }

  async function onDrop(event: React.DragEvent, stage: LeadStage) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("application/x-buildflow-lead") || event.dataTransfer.getData("text/plain");
    const lead = leads.find((item) => item.id === leadId);
    setDraggingId(null);
    setDropStage(null);
    if (lead) await move(lead, stage);
  }

  const columns: Column<Lead>[] = [
    { key: "name", header: "Lead", sortable: true, hideable: false, render: (l) => (
      <span className="block">
        <span className="block truncate font-medium">{l.name}</span>
        <span className="num block text-xs text-subtle">{l.id} · {l.contact}</span>
      </span>
    ) },
    { key: "stage", header: "Stage", render: (l) => <StatusBadge status={l.stage} /> },
    { key: "value", header: "Value", align: "right", sortable: true, render: (l) => formatMoney(l.value, tenant.currency, 0) },
    { key: "source", header: "Source", sortable: true },
    { key: "owner", header: "Owner", sortable: true },
    { key: "region", header: "Region", defaultHidden: true },
    { key: "nextAction", header: "Next action" },
    { key: "createdAt", header: "Created", sortable: true, render: (l) => formatRelative(l.createdAt) },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (l) => (
        <RowActions
          label={l.name}
          onEdit={() => setEditing(l)}
          onDuplicate={() => setDuplicate(l)}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "leads", l.id);
            refresh();
          }}
        />
      )
    }
  ];

  const activeLead = editing ?? duplicate;
  const leadInitialValues = activeLead
    ? { ...activeLead, contactName: activeLead.contact, estimatedValue: activeLead.value, ownerName: activeLead.owner }
    : undefined;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Track enquiries from first contact through to a won or lost decision."
        actions={
          <>
            <SegmentedControl value={view} onChange={setView} options={[{ value: "pipeline", label: "Pipeline" }, { value: "list", label: "List" }]} />
            <Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New lead</Button>
          </>
        }
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search leads, contacts, owners…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "stage", label: "Stage", options: optionsFrom(STAGES) },
          { key: "owner", label: "Owner", options: optionsFrom(Array.from(new Set(leads.map((r) => r.owner)))) },
          { key: "source", label: "Source", options: optionsFrom(Array.from(new Set(leads.map((r) => r.source)))) }
        ]}
      />

      {view === "pipeline" ? (
        <div className="grid gap-2 overflow-x-auto pb-2 lg:grid-flow-col lg:auto-cols-[minmax(220px,1fr)]">
          {STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            const value = items.reduce((s, l) => s + l.value, 0);
            return (
              <div
                key={stage}
                onDragOver={(event) => onDragOver(event, stage)}
                onDragLeave={() => setDropStage((current) => (current === stage ? null : current))}
                onDrop={(event) => onDrop(event, stage)}
                className={`min-w-[220px] rounded-lg border bg-surface transition-colors ${
                  dropStage === stage ? "border-accent bg-accent/5" : "border-hairline"
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2">
                  <StatusBadge status={stage} />
                  <span className="num text-xs text-muted">{items.length} · {formatMoneyCompact(value, tenant.currency)}</span>
                </div>
                <ul className="min-h-[120px] space-y-1.5 p-1.5">
                  {items.map((lead) => (
                    <li
                      key={lead.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, lead)}
                      onDragEnd={() => { setDraggingId(null); setDropStage(null); }}
                      className={`group cursor-grab rounded-md border border-hairline bg-canvas p-2.5 shadow-sm transition active:cursor-grabbing ${
                        draggingId === lead.id ? "scale-[0.98] opacity-55 ring-2 ring-accent/30" : "hover:border-strongline hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-subtle transition-colors group-hover:text-muted" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lead.name}</p>
                          <p className="num mt-0.5 text-xs text-muted">{lead.contact} · {lead.source}</p>
                          <p className="num mt-1.5 text-sm font-semibold">{formatMoney(lead.value, tenant.currency, 0)}</p>
                          <p className="mt-1 text-xs text-subtle">Next: {lead.nextAction}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <Menu
                          width="w-44"
                          align="left"
                          trigger={({ toggle }) => <Button size="sm" onClick={toggle}>Move</Button>}
                        >
                          {(close) => (
                            <>
                              <MenuLabel>Move to stage</MenuLabel>
                              {STAGES.filter((s) => s !== stage).map((s) => (
                                <MenuItem key={s} onClick={() => { close(); move(lead, s); }}>{s.replace(/_/g, " ").toLowerCase()}</MenuItem>
                              ))}
                            </>
                          )}
                        </Menu>
                        <span className="truncate text-2xs uppercase tracking-wider text-subtle">{lead.owner.split(" ")[0]}</span>
                      </div>
                    </li>
                  ))}
                  {!items.length ? <li className="px-2 py-6 text-center text-xs text-subtle">No leads</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          rows={leads}
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
          selectable
          exportName="leads"
          empty={{
            title: "No leads yet",
            description: "Log enquiries here so nothing slips between a call and a quotation.",
            action: <Button variant="primary" onClick={() => setCreating(true)}>New lead</Button>
          }}
        />
      )}

      {view === "pipeline" && !loading && leads.length === 0 ? (
        <Card className="mt-3 p-10 text-center text-sm text-muted">
          <p>No leads match these filters.</p>
          <Button className="mt-3" variant="primary" onClick={() => setCreating(true)}>New lead</Button>
        </Card>
      ) : null}

      <CreateRecordDrawer
        open={creating || Boolean(activeLead)}
        onClose={() => { setCreating(false); setEditing(null); setDuplicate(null); }}
        resource="leads"
        title={editing ? "Edit lead" : duplicate ? "Duplicate lead" : "New lead"}
        subtitle="Capture the enquiry now; convert it to a client and project when it firms up."
        recordId={editing?.id}
        initialValues={leadInitialValues}
        onCreated={refresh}
        fields={[
          { name: "name", label: "Enquiry", required: true, placeholder: "4-bedroom build  Adenta", full: true },
          { name: "contactName", label: "Contact name", required: true },
          { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "+233 24 000 0000" },
          { name: "stage", label: "Stage", type: "select", defaultValue: "NEW", options: optionsFrom(STAGES) },
          { name: "estimatedValue", label: "Estimated value", type: "number", placeholder: "0.00" },
          { name: "source", label: "Source", type: "select", options: optionsFrom(["Referral", "WhatsApp", "Website", "Site signage", "Repeat client", "Instagram"]) },
          { name: "ownerName", label: "Owner", placeholder: "Full name" },
          { name: "region", label: "Region", type: "select", options: reference.regions.map((r: string) => ({ value: r, label: r })), defaultValue: tenant.region },
          { name: "nextAction", label: "Next action", placeholder: "Schedule site visit", full: true }
        ]}
      />
    </>
  );
}
