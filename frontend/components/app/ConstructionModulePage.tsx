"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Copy, Download, Edit3, MoreHorizontal, PlayCircle,
  Plus, Search, ShieldCheck, Trash2, XCircle
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Card, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Modal } from "../ui/Overlay";
import { Tabs } from "../ui/Tabs";
import { DataTable, type Column } from "../ui/DataTable";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../ui/Menu";
import { formatDate, formatNumber } from "../../lib/format";
import { useTenantContext } from "./TenantProvider";
import { createRecord, deleteRecord, downloadCsv, patchRecord, postJson, toCsv, useList } from "../../lib/client";
import type { ConstructionModuleRecord, Project } from "../../lib/types";

type ModuleKind = "accommodation";

const OPEN_STATUSES = ["Open", "In progress", "Pending", "At risk"];
const DONE_STATUSES = ["Resolved", "Closed", "Verified", "Signed", "Active"];

type ModuleConfig = {
  title: string;
  description: string;
  primaryAction: string;
  infoTitle: string;
  infoBody: string;
  /** Tab label, and the statuses it shows. An empty list means everything. */
  tabs: { label: string; statuses: string[] }[];
  types: string[];
  statuses: string[];
};

const CONFIG: Record<ModuleKind, ModuleConfig> = {
  accommodation: {
    title: "Accommodation",
    description: "Worker camps, rentals and hotels with rooms, bookings and charges in one place.",
    primaryAction: "New accommodation",
    infoTitle: "Control site accommodation capacity",
    infoBody: "Track properties, capacity, occupants, bookings, charges and links to employees or project sites.",
    tabs: [
      { label: "All", statuses: [] },
      { label: "Worker camp", statuses: [] },
      { label: "Rental", statuses: [] },
      { label: "Hotel", statuses: [] }
    ],
    types: ["Worker camp", "Rental", "Hotel"],
    statuses: ["Active", "Full", "Closed"]
  }
};

export function ConstructionModulePage({ kind }: { kind: ModuleKind }) {
  const { tenant, user } = useTenantContext();
  const config = CONFIG[kind];
  const [tab, setTab] = useState(config.tabs[0].label);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ConstructionModuleRecord | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const { rows, loading, error, refresh } = useList<ConstructionModuleRecord>("moduleRecords", {
    module: kind,
    q: query,
    project: projectFilter || undefined,
    status: statusFilter || undefined,
    size: 100
  });

  // The tabs narrow what is already loaded by accommodation type.
  const visible = useMemo(() => {
    const active = config.tabs.find((entry) => entry.label === tab);
    if (!active || tab === config.tabs[0].label) return rows;
    return rows.filter((row) => row.type === tab);
  }, [rows, tab, config.tabs]);

  const kpis = useKpis(kind, rows);
  const columns = useMemo<Column<ConstructionModuleRecord>[]>(() => [
    {
      key: "projectName",
      header: "Project",
      sortable: true,
      render: (row) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-fg">{row.projectName ?? "Unassigned"}</p>
          <p className="text-xs text-subtle">{formatDate(row.createdAt)}</p>
        </div>
      ),
      csv: (row) => row.projectName ?? ""
    },
    { key: "source", header: "Source", width: "92px", csv: (row) => row.source },
    { key: "type", header: "Type", csv: (row) => row.type },
    {
      key: "title",
      header: "Label / text",
      render: (row) => (
        <div className="min-w-[220px]">
          <p className="font-medium text-fg">{row.title}</p>
          {row.details ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.details}</p> : null}
        </div>
      ),
      csv: (row) => row.title
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (row) => (
        <Badge tone={OPEN_STATUSES.includes(row.status) ? "warning" : DONE_STATUSES.includes(row.status) ? "success" : "neutral"}>
          {row.status}
        </Badge>
      ),
      csv: (row) => row.status
    },
    { key: "owner", header: "Owner", defaultHidden: true, csv: (row) => row.owner ?? "" },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      hideable: false,
      render: (row) => (
        <RecordActions
          row={row}
          kind={kind}
          slug={tenant.slug}
          busy={busyAction === row.id}
          onBusy={(busy) => setBusyAction(busy ? row.id : null)}
          onEdit={() => setEditing(row)}
          onChanged={refresh}
        />
      ),
      csv: () => ""
    }
  ], [busyAction, kind, refresh, tenant.slug]);

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> {config.primaryAction}
          </Button>
        }
      />

      <Card className="mb-3 overflow-hidden border-info/30 bg-info/5">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-info/10 text-info"><ClipboardCheck className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{config.infoTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{config.infoBody}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, detail]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            <p className="num mt-1 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Card>
            <CardHeader
              title={`${config.title} workspace`}
              subtitle="Records kept against your own projects"
              action={
                <Button
                  size="sm"
                  disabled={!visible.length}
                  onClick={() => downloadCsv(`${kind}.csv`, toCsv(visible, [
                    { key: "projectName", label: "Project" },
                    { key: "source", label: "Source" },
                    { key: "type", label: "Type" },
                    { key: "title", label: "Title" },
                    { key: "status", label: "Status" },
                    { key: "owner", label: "Owner" },
                    { key: "createdAt", label: "Created" }
                  ]))}
                >
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              }
            />
            <div className="border-b border-hairline px-4 pt-3">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={config.tabs.map((entry) => ({ value: entry.label, label: entry.label }))}
              />
            </div>
            <div className="grid gap-2 border-b border-hairline p-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
              <label className="flex h-9 items-center gap-2 rounded border border-hairline bg-surface px-3 text-sm">
                <Search className="h-4 w-4 text-subtle" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  placeholder="Search records..."
                  aria-label="Search records"
                />
              </label>
              <Select aria-label="Filter by project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                <option value="">All projects</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </Select>
              <Select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {config.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </div>

            <DataTable
              rows={visible}
              columns={columns}
              getId={(row) => row.id}
              loading={loading}
              error={error}
              total={visible.length}
              exportName={kind}
              dense
              empty={{
                title: `No ${config.title.toLowerCase()} records yet`,
                description: "Create the first record to start tracking this operation.",
                action: <Button variant="primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> {config.primaryAction}</Button>
              }}
            />
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader title="Context" subtitle="Counted from the records on this page" />
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <SmallMetric label="Records" value={formatNumber(rows.length)} />
              <SmallMetric label="Still open" value={formatNumber(rows.filter((row) => OPEN_STATUSES.includes(row.status)).length)} />
              <SmallMetric label="Projects covered" value={formatNumber(new Set(rows.map((row) => row.projectId).filter(Boolean)).size)} />
              <SmallMetric
                label="Last entry"
                value={rows.length
                  ? formatDate([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt)
                  : "—"}
              />
            </div>
            <div className="rounded border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Link each record to its project so field, estimating and finance see the same job.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <RecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kind={kind}
        config={config}
        projects={projects}
        defaultOwner={user.name}
        slug={tenant.slug}
        onSaved={refresh}
      />
      <RecordModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        kind={kind}
        config={config}
        projects={projects}
        defaultOwner={user.name}
        slug={tenant.slug}
        record={editing}
        onSaved={refresh}
      />
    </>
  );
}

function RecordActions({ row, kind, slug, busy, onBusy, onEdit, onChanged }: {
  row: ConstructionModuleRecord;
  kind: ModuleKind;
  slug: string;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const actions = transitionActions(kind, row.status);

  async function run(action: string) {
    onBusy(true);
    try {
      await postJson(`/api/t/${slug}/moduleRecords/${row.id}/${action}`, {});
      onChanged();
    } catch (error) {
      window.alert((error as { message?: string }).message ?? "The workflow action failed.");
    } finally {
      onBusy(false);
    }
  }

  async function duplicate() {
    onBusy(true);
    try {
      await createRecord(slug, "moduleRecords", {
        module: row.module,
        title: `${row.title} copy`,
        projectId: row.projectId || undefined,
        source: row.source,
        type: row.type,
        status: "Open",
        priority: row.priority,
        owner: row.owner,
        dueDate: row.dueDate,
        value: row.value,
        quantity: row.quantity,
        unit: row.unit,
        linkedRecord: row.linkedRecord,
        details: row.details
      });
      onChanged();
    } catch (error) {
      window.alert((error as { message?: string }).message ?? "The record could not be duplicated.");
    } finally {
      onBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    onBusy(true);
    try {
      await deleteRecord(slug, "moduleRecords", row.id);
      onChanged();
    } catch (error) {
      window.alert((error as { message?: string }).message ?? "The record could not be deleted.");
    } finally {
      onBusy(false);
    }
  }

  function exportOne() {
    downloadCsv(`${kind}-${row.id}.csv`, toCsv([row as unknown as Record<string, unknown>], [
      { key: "projectName", label: "Project" },
      { key: "source", label: "Source" },
      { key: "type", label: "Type" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "owner", label: "Owner" },
      { key: "details", label: "Details" },
      { key: "createdAt", label: "Created" },
      { key: "updatedAt", label: "Updated" }
    ]));
  }

  return (
    <Menu
      width="w-56"
      trigger={({ toggle }) => (
        <IconButton label={`Actions for ${row.title}`} variant="secondary" disabled={busy} onClick={(event) => { event.stopPropagation(); toggle(); }}>
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Record</MenuLabel>
          <MenuItem icon={Edit3} onClick={() => { close(); onEdit(); }}>View / edit</MenuItem>
          <MenuItem icon={Copy} onClick={() => { close(); void duplicate(); }}>Duplicate</MenuItem>
          <MenuItem icon={Download} onClick={() => { close(); exportOne(); }}>Export row</MenuItem>
          {actions.length ? (
            <>
              <MenuSeparator />
              <MenuLabel>Workflow</MenuLabel>
              {actions.map((action) => (
                <MenuItem key={action.action} icon={action.icon} onClick={() => { close(); void run(action.action); }}>
                  {action.label}
                </MenuItem>
              ))}
            </>
          ) : null}
          <MenuSeparator />
          <MenuItem icon={Trash2} danger onClick={() => { close(); void remove(); }}>Delete</MenuItem>
        </>
      )}
    </Menu>
  );
}

function transitionActions(kind: ModuleKind, status: string) {
  void kind;
  if (status === "Active") return [
    { label: "Mark full", action: "mark-full", icon: ShieldCheck },
    { label: "Close", action: "close", icon: XCircle }
  ];
  if (status === "Full") return [
    { label: "Activate", action: "activate", icon: PlayCircle },
    { label: "Close", action: "close", icon: XCircle }
  ];
  return [{ label: "Activate", action: "activate", icon: PlayCircle }];
}

/** Every figure here is counted from the records the page has loaded. */
function useKpis(kind: ModuleKind, rows: ConstructionModuleRecord[]): [string, string, string][] {
  return useMemo(() => {
    void kind;
    const beds = rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
    const camps = rows.filter((row) => row.type === "Worker camp").length;
    return [
      ["Properties", formatNumber(rows.length), rows.length ? "on the register" : "none yet"],
      ["Capacity", formatNumber(beds), "beds"],
      ["Worker camps", formatNumber(camps), "sites"],
      ["Rentals + hotels", formatNumber(rows.length - camps), "other properties"]
    ];
  }, [kind, rows]);
}

/** Saves what the form was filled in with, rather than posting a canned record. */
function RecordModal({ open, onClose, kind, config, projects, defaultOwner, slug, record, onSaved }: {
  open: boolean;
  onClose: () => void;
  kind: ModuleKind;
  config: ModuleConfig;
  projects: Project[];
  defaultOwner: string;
  slug: string;
  record?: ConstructionModuleRecord | null;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) {
      setError("Give the record a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const quantity = form.get("quantity");
      const body = {
        module: kind,
        title,
        projectId: String(form.get("projectId") || "") || undefined,
        source: "FIELD",
        type: String(form.get("type") || config.types[0]),
        status: String(form.get("status") || config.statuses[0]),
        owner: String(form.get("owner") || defaultOwner),
        quantity: quantity ? Number(quantity) : undefined,
        dueDate: String(form.get("dueDate") || "") || undefined,
        priority: String(form.get("priority") || "") || undefined,
        details: String(form.get("details") || "") || undefined
      };
      if (record) {
        await patchRecord(slug, "moduleRecords", record.id, body);
      } else {
        await createRecord(slug, "moduleRecords", body);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as { message?: string }).message ?? "The record could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? "Edit record" : config.primaryAction}
      description={record ? "Update the operational record and keep the backend in sync." : `Add a ${config.title.toLowerCase()} record for this company.`}
    >
      <form key={record?.id ?? "new"} className="grid gap-3" onSubmit={submit}>
        <Field label="Project">
          <Select name="projectId" defaultValue={record?.projectId ?? ""}>
            <option value="">Not linked to a project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
        </Field>
        <Field label="Title" required>
          <Input name="title" required data-autofocus defaultValue={record?.title ?? ""} placeholder={`New ${config.title.toLowerCase()} record`} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select name="type" defaultValue={record?.type ?? config.types[0]}>
              {config.types.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={record?.status ?? config.statuses[0]}>
              {config.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Owner"><Input name="owner" defaultValue={record?.owner ?? defaultOwner} /></Field>
          <Field
            label="Capacity (beds)"
            hint="Optional"
          >
            <Input name="quantity" type="number" min="0" step="1" defaultValue={record?.quantity ?? ""} placeholder="0" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due date" hint="Optional"><Input name="dueDate" type="date" defaultValue={record?.dueDate ?? ""} /></Field>
          <Field label="Priority" hint="Optional">
            <Select name="priority" defaultValue={record?.priority ?? ""}>
              <option value="">No priority</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </Select>
          </Field>
        </div>
        <Field label="Details">
          <Textarea name="details" rows={4} defaultValue={record?.details ?? ""} placeholder="Add record details, source notes or field instructions." />
        </Field>
        {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-hairline p-2">
      <p className="label-micro">{label}</p>
      <p className="num mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
