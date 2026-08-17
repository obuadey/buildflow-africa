"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BadgeDollarSign, Building2, CalendarDays, Check, ChevronDown, ChevronUp,
  CloudSun, FileText, Gauge, Globe2, Layers, LayoutGrid,
  MapPin, Plus, Rocket, Search, ShieldCheck, Sparkles, Star, X
} from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { RowActions } from "../../../components/app/RowActions";
import { CreateRecordDrawer, type FormField } from "../../../components/app/CreateRecordDrawer";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Button, IconButton } from "../../../components/ui/Button";
import { Checkbox, Field, Input, SegmentedControl, Select, Textarea } from "../../../components/ui/Field";
import { Modal } from "../../../components/ui/Overlay";
import { Badge, StatusBadge } from "../../../components/ui/Badge";
import { Progress } from "../../../components/ui/Misc";
import { Card } from "../../../components/ui/Card";
import { createRecord, deleteRecord, patchRecord, useList } from "../../../lib/client";
import { formatMoney, formatMoneyCompact, formatPercent } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import { GHANA_REGIONS } from "../../../lib/regions";
import type { Client, Project, ProjectStatus } from "../../../lib/types";

const STATUSES = ["DRAFT", "ESTIMATING", "QUOTED", "APPROVED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const HEALTH = ["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"];
const TYPES = ["Residential", "Commercial", "Renovation", "Civil", "Fit-Out", "Industrial"];
const STANDARDS = ["Ghana Standard", "MasterFormat", "DIN 276", "NRM", "SMM7", "CIVICR"];
const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "ZAR", "CHF"];
const LANGUAGES = ["English", "Twi", "Ga", "Ewe", "French"];

const PROJECT_PRESETS = [
  { id: "bim", title: "BIM Quality Check", detail: "Check model quality, compliance and project records.", modules: 20 },
  { id: "cost", title: "Cost Estimation Only", detail: "BOQ and estimates without construction management.", modules: 20 },
  { id: "tender", title: "Tender Preparation", detail: "Prepare and submit tenders, manage RFQs.", modules: 28 },
  { id: "full", title: "Full Construction Lifecycle", detail: "Full cycle from tender to handover.", modules: 47 },
  { id: "property", title: "Property Development", detail: "Development: finance, sales, portfolio.", modules: 30 },
  { id: "site", title: "Site Management", detail: "Field work, inspections, NCR and site accommodation.", modules: 26 },
  { id: "consulting", title: "BIM Consulting", detail: "BIM consulting: EIR / BEP / audit.", modules: 25 },
  { id: "facility", title: "Facility Management / Operations", detail: "Operations and asset management.", modules: 24 },
  { id: "empty", title: "Empty / Custom", detail: "Start from core only and add modules as you go.", modules: 15 }
];

const SCOPE_TAGS = ["BIM Quality Check", "Cost Estimation", "Tender Preparation", "Construction Execution", "Property Development", "Site Management", "Consulting", "Facility Management"];
const PHASE_TAGS = ["Concept", "Design", "Tender", "Construction", "Handover"];

type ProjectForm = {
  name: string;
  description: string;
  region: string;
  standard: string;
  currency: string;
  language: string;
  code: string;
  type: string;
  clientId: string;
  owner: string;
  addressSearch: string;
  street: string;
  city: string;
  country: string;
  postalCode: string;
  startDate: string;
  endDate: string;
  budget: string;
  contractValue: string;
  regionalFactor: string;
  size: string;
  role: string;
};

function initialProjectForm(tenant: { region: string; city: string; currency: string }): ProjectForm {
  return {
    name: "",
    description: "",
    region: tenant.region,
    standard: "Ghana Standard",
    currency: tenant.currency || "GHS",
    language: "English",
    code: "",
    type: "Commercial",
    clientId: "",
    owner: "",
    addressSearch: "",
    street: "",
    city: tenant.city,
    country: "Ghana",
    postalCode: "",
    startDate: "",
    endDate: "",
    budget: "",
    contractValue: "",
    regionalFactor: "1.00",
    size: "Medium",
    role: "General Contractor"
  };
}

export default function ProjectsPage() {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState(
    { status: search.get("status") ?? "", health: search.get("health") ?? "" },
    "contractValue"
  );
  const [view, setView] = useState<"list" | "cards">("cards");
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [editing, setEditing] = useState<Project | null>(null);
  const [duplicate, setDuplicate] = useState<Project | null>(null);
  const [sampleBanner, setSampleBanner] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const { rows, total, pages, loading, error, refresh } = useList<Project>("projects", state.params);
  const { rows: clients } = useList<Client>("clients", { size: 100 });

  const portfolioStats = useMemo(() => {
    const totalValue = rows.reduce((s, p) => s + p.contractValue, 0);
    return {
      active: rows.filter((p) => p.status === "ACTIVE").length,
      boqs: Math.max(rows.length + 9, rows.length),
      totalValue,
      avgValue: rows.length ? totalValue / rows.length : 0
    };
  }, [rows]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (state.sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "createdAt") copy.sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (state.sort === "contractValue") copy.sort((a, b) => b.contractValue - a.contractValue);
    return copy;
  }, [rows, state.sort]);

  function openCreate() {
    setCreating(true);
    const next = new URLSearchParams(search.toString());
    next.set("new", "1");
    router.replace(`${path("/projects")}?${next.toString()}`, { scroll: false });
  }

  function closeCreate() {
    setCreating(false);
    const next = new URLSearchParams(search.toString());
    next.delete("new");
    const qs = next.toString();
    router.replace(`${path("/projects")}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  async function setProjectStatus(project: Project, status: ProjectStatus) {
    await patchRecord<Project>(tenant.slug, "projects", project.id, {
      status,
      health: status === "COMPLETED" ? "COMPLETED" : project.health,
      completion: status === "COMPLETED" ? 100 : project.completion
    });
    refresh();
  }

  const projectFields: FormField[] = [
    { name: "name", label: "Project name", required: true, full: true },
    { name: "clientId", label: "Client", type: "select", options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { name: "type", label: "Project type", type: "select", options: TYPES.map((t) => ({ value: t, label: t })) },
    { name: "status", label: "Status", type: "select", options: optionsFrom(STATUSES), required: true },
    { name: "health", label: "Health", type: "select", options: optionsFrom(HEALTH), required: true },
    { name: "region", label: "Region", type: "select", options: GHANA_REGIONS.map((r) => ({ value: r, label: r })) },
    { name: "city", label: "City" },
    { name: "manager", label: "Manager" },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "endDate", label: "Expected completion", type: "date" },
    { name: "budget", label: "Budget", type: "number" },
    { name: "contractValue", label: "Contract value", type: "number" },
    { name: "completion", label: "Completion %", type: "number" },
    { name: "risk", label: "Risk note", full: true },
    { name: "description", label: "Description", type: "textarea", full: true }
  ];

  const activeProject = editing ?? duplicate;
  const activeProjectInitial = activeProject ? {
    ...activeProject,
    name: duplicate ? `${activeProject.name} copy` : activeProject.name,
    status: duplicate ? "DRAFT" : activeProject.status,
    completion: duplicate ? 0 : activeProject.completion
  } : undefined;

  const columns: Column<Project>[] = [
    {
      key: "name", header: "Project", sortable: true, hideable: false, width: "24%",
      render: (p) => (
        <span className="block">
          <span className="block truncate font-medium">{p.name}</span>
          <span className="num block text-xs text-subtle">{p.reference} · {p.city}</span>
        </span>
      )
    },
    { key: "clientName", header: "Client", sortable: true, render: (p) => <span className="block max-w-[160px] truncate">{p.clientName}</span> },
    { key: "contractValue", header: "Contract", align: "right", sortable: true, render: (p) => formatMoney(p.contractValue, tenant.currency, 0) },
    { key: "cost", header: "Spent", align: "right", sortable: true, render: (p) => formatMoney(p.cost, tenant.currency, 0) },
    {
      key: "profit", header: "Profit", align: "right", sortable: true,
      render: (p) => (
        <span className={p.contractValue - p.cost < 0 ? "text-danger" : ""}>
          {formatMoney(p.contractValue - p.cost, tenant.currency, 0)}
        </span>
      ),
      csv: (p) => p.contractValue - p.cost
    },
    {
      key: "completion", header: "Completion", sortable: true, width: "12%",
      render: (p) => (
        <span className="block">
          <span className="num mb-1 block text-xs text-muted">{p.completion}%</span>
          <Progress value={p.completion} tone={p.health === "DELAYED" ? "danger" : p.health === "AT_RISK" ? "warning" : "brand"} />
        </span>
      )
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "health", header: "Health", render: (p) => <StatusBadge status={p.health} />, defaultHidden: true },
    { key: "manager", header: "Manager", sortable: true, defaultHidden: true },
    { key: "region", header: "Region", sortable: true, defaultHidden: true },
    {
      key: "actions", header: "Actions", align: "right", hideable: false,
      render: (p) => (
        <ProjectActions
          project={p}
          onView={() => router.push(path(`/projects/${p.id}`))}
          onEdit={() => setEditing(p)}
          onDuplicate={() => setDuplicate(p)}
          onStatus={setProjectStatus}
          onDelete={async () => {
            await deleteRecord(tenant.slug, "projects", p.id);
            refresh();
          }}
        />
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every project aggregates its estimate, quotations, contract, variations, invoices, payments and expenses."
        actions={
          <>
            <Button variant="primary" onClick={openCreate}><Plus className="h-4 w-4" /> New project</Button>
          </>
        }
      />

      {sampleBanner ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <Button size="sm" onClick={() => setSampleBanner(false)}>Remove sample data</Button>
        </div>
      ) : null}

      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioCard label="Total projects" value={String(total || rows.length)} hint={`${portfolioStats.active} active`} tone="success" />
        <PortfolioCard label="Total BOQs" value={String(portfolioStats.boqs)} hint={`${rows.length ? (portfolioStats.boqs / rows.length).toFixed(1) : "0.0"} per project`} />
        <PortfolioCard label="Total value" value={formatMoneyCompact(portfolioStats.totalValue, tenant.currency)} hint="Tenant base currency" />
        <PortfolioCard label="Avg project size" value={formatMoneyCompact(portfolioStats.avgValue, tenant.currency)} hint="Weighted portfolio" />
      </div>

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search projects, clients, locations…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "status", label: "Status", options: optionsFrom(STATUSES) },
          { key: "health", label: "Health", options: optionsFrom(HEALTH) },
          { key: "type", label: "Type", options: TYPES.map((t) => ({ value: t, label: t })) },
          { key: "client", label: "Client", options: clients.map((c) => ({ value: c.id, label: c.name })) },
          { key: "region", label: "Region", options: GHANA_REGIONS.map((r) => ({ value: r, label: r })) },
          { key: "manager", label: "Manager", options: optionsFrom(Array.from(new Set(rows.map((r) => r.manager)))) }
        ]}
      />

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-hairline bg-surface px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <SegmentedControl value={view} onChange={setView} options={[{ value: "cards", label: "Cards" }, { value: "list", label: "List" }]} />
          <span className="hidden h-6 w-px bg-hairline sm:block" />
          <Button size="sm" variant={state.sort === "name" ? "secondary" : "ghost"} onClick={() => state.onSort("name", "asc")}>Name A-Z</Button>
          <Button size="sm" variant={state.sort === "createdAt" ? "secondary" : "ghost"} onClick={() => state.onSort("createdAt", "desc")}>Newest</Button>
          <Button size="sm" variant={state.sort === "contractValue" ? "secondary" : "ghost"} onClick={() => state.onSort("contractValue", "desc")}>Value</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={showWeather ? "secondary" : "ghost"} onClick={() => setShowWeather((v) => !v)}><CloudSun className="h-3.5 w-3.5" /> Weather</Button>
        </div>
      </div>

      {view === "list" ? (
        <DataTable
          rows={sortedRows}
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
          onRowClick={(p) => router.push(path(`/projects/${p.id}`))}
          selectable
          bulkActions={(selected, clear) => (
            <>
              <Button size="sm" variant="secondary" onClick={async () => {
                await Promise.all(selected.map((project) => patchRecord(tenant.slug, "projects", project.id, { status: "ON_HOLD" })));
                clear();
                refresh();
              }}>Put on hold</Button>
              <Button size="sm" variant="secondary" onClick={async () => {
                await Promise.all(selected.map((project) => patchRecord(tenant.slug, "projects", project.id, { status: "ACTIVE", health: project.health === "COMPLETED" ? "ON_TRACK" : project.health })));
                clear();
                refresh();
              }}>Activate</Button>
            </>
          )}
          exportName="projects"
          empty={{
            title: "No projects yet",
            description: "Create your first project to begin estimating and tracking construction work.",
            action: <Button variant="primary" onClick={openCreate}>Create project</Button>
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedRows.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              path={path}
              currency={tenant.currency}
              showWeather={showWeather}
              onEdit={() => setEditing(p)}
              onDuplicate={() => setDuplicate(p)}
              onStatus={setProjectStatus}
              onDelete={async () => {
                await deleteRecord(tenant.slug, "projects", p.id);
                refresh();
              }}
            />
          ))}
          {!loading && rows.length === 0 ? (
            <Card className="col-span-full p-10 text-center text-sm text-muted">No projects match these filters.</Card>
          ) : null}
        </div>
      )}

      <NewProjectModal
        open={creating}
        onClose={closeCreate}
        clients={clients}
        initial={initialProjectForm(tenant)}
        onCreated={(project) => {
          refresh();
          closeCreate();
          router.push(path(`/projects/${project.id}`));
        }}
      />

      <CreateRecordDrawer
        open={Boolean(activeProject)}
        onClose={() => { setEditing(null); setDuplicate(null); }}
        resource="projects"
        title={editing ? "Edit project" : "Duplicate project"}
        subtitle={editing ? "Update delivery, commercial and reporting fields." : "Create a new project using this project as a starting point."}
        recordId={editing?.id}
        initialValues={activeProjectInitial}
        onCreated={refresh}
        fields={projectFields}
      />
    </>
  );
}

export const dynamic = "force-dynamic";

function PortfolioCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "success" }) {
  return (
    <Card className="p-4">
      <p className="label-micro">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${tone === "success" ? "bg-success/10 text-success" : "text-muted"}`}>{hint}</p>
    </Card>
  );
}

function ProjectCard({
  project, path, currency, showWeather, onEdit, onDuplicate, onStatus, onDelete
}: {
  project: Project;
  path: (p: string) => string;
  currency: string;
  showWeather: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onStatus: (project: Project, status: ProjectStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const initials = project.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 1).toUpperCase();
  const city = project.city || project.region;
  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-raised">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-700 shadow-sm">{initials}</span>
          <div className="ml-auto flex items-center gap-2 text-slate-500">
            <IconButton label="Pin project" className="h-7 w-7"><Star className="h-4 w-4" /></IconButton>
            <ProjectActions
              project={project}
              onView={() => window.location.assign(path(`/projects/${project.id}`))}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onStatus={onStatus}
              onDelete={onDelete}
            />
          </div>
        </div>
        <Link href={path(`/projects/${project.id}`)} className="mt-4 block text-lg font-semibold tracking-tight hover:text-accent">
          {project.name}
        </Link>
        <p className="mt-2 line-clamp-2 min-h-[44px] text-sm leading-6 text-muted">
          {project.type} project for {project.clientName}. {project.manager} manages delivery, commercial tracking and close-out.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="info">{project.region === "Greater Accra" ? "Ghana Standard" : "MasterFormat"}</Badge>
          <Badge>{currency}</Badge>
          <Badge>{project.region}</Badge>
          <Badge>{city}</Badge>
          <Badge tone="danger">PDF</Badge>
        </div>
        <div className="mt-4 rounded-lg border border-hairline p-3">
          <p className="label-micro">Total value</p>
          <p className="num mt-1 text-2xl font-semibold">{formatMoney(project.contractValue, currency, 0)}</p>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Completion</span>
            <span className="num">{project.completion}%</span>
          </div>
          <Progress value={project.completion} tone={project.health === "DELAYED" ? "danger" : project.health === "AT_RISK" ? "warning" : "brand"} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-xs text-muted">
          <span>{showWeather ? "7d 24/31° · 3.0mm" : "5 hours ago"} <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 num">2 BOQs</span></span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Card>
  );
}

function ProjectActions({
  project, onView, onEdit, onDuplicate, onStatus, onDelete
}: {
  project: Project;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onStatus: (project: Project, status: ProjectStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <RowActions
      label={project.name}
      onView={onView}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      actions={[
        ...(project.status !== "ACTIVE" && project.status !== "COMPLETED" && project.status !== "CANCELLED" ? [{
          label: "Activate project",
          icon: Rocket,
          onClick: () => onStatus(project, "ACTIVE")
        }] : []),
        ...(project.status !== "ON_HOLD" && project.status !== "COMPLETED" && project.status !== "CANCELLED" ? [{
          label: "Put on hold",
          icon: ShieldCheck,
          onClick: () => onStatus(project, "ON_HOLD")
        }] : []),
        ...(project.status !== "COMPLETED" && project.status !== "CANCELLED" ? [{
          label: "Mark complete",
          icon: Check,
          onClick: () => onStatus(project, "COMPLETED")
        }] : []),
        ...(project.status !== "CANCELLED" ? [{
          label: "Cancel project",
          icon: X,
          danger: true,
          onClick: async () => {
            if (!window.confirm(`Cancel ${project.name}? This keeps the project for reporting but stops active work.`)) return;
            await onStatus(project, "CANCELLED");
          }
        }] : [])
      ]}
      onDelete={onDelete}
      deleteConfirm={`Delete ${project.name}? Projects with invoices cannot be removed.`}
    />
  );
}

function NewProjectModal({
  open, onClose, clients, initial, onCreated
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  initial: ProjectForm;
  onCreated: (project: Project) => void;
}) {
  const { tenant, user } = useTenantContext();
  const [mode, setMode] = useState<"choice" | "quick" | "guided">("choice");
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [preset, setPreset] = useState("full");
  const [scope, setScope] = useState<string[]>(["BIM Quality Check"]);
  const [phases, setPhases] = useState<string[]>(["Design"]);
  const [focusMode, setFocusMode] = useState(true);
  const [form, setForm] = useState<ProjectForm>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(name: keyof ProjectForm, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function submit() {
    if (!form.name.trim()) { setError("Enter a project name."); return; }
    setBusy(true);
    setError(null);
    try {
      const selectedClient = clients.find((c) => c.id === form.clientId) ?? clients[0];
      const amount = Number(form.contractValue || form.budget || 0);
      const project = await createRecord<Project>(tenant.slug, "projects", {
        name: form.name.trim(),
        clientId: selectedClient?.id,
        projectNumber: form.code || undefined,
        type: form.type,
        region: form.region,
        city: form.city || tenant.city,
        location: [form.street, form.city, form.country, form.postalCode].filter(Boolean).join(", ") || form.addressSearch,
        status: "ACTIVE" satisfies ProjectStatus,
        health: "ON_TRACK",
        risk: "",
        contractValue: amount,
        cost: 0,
        invoiced: 0,
        paid: 0,
        completion: 0,
        manager: user.name,
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
        endDate: form.endDate || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        description: form.description,
        currency: form.currency,
        classification: form.standard,
        language: form.language,
        regionalFactor: Number(form.regionalFactor || 1),
        projectScope: scope,
        lifecyclePhases: phases,
        focusMode
      });
      onCreated(project);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Project could not be created.");
    } finally {
      setBusy(false);
    }
  }

  function resetAndClose() {
    setMode("choice");
    setStep(0);
    setForm(initial);
    setError(null);
    onClose();
  }

  const title = mode === "choice" ? "Choose how you want to set this project up" : mode === "quick" ? "Quick create - just the essentials" : `Step ${step + 1} of 5 - ${["Basics", "Region & currency", "Project type", "Project scope", "Site & review"][step]}`;

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="New Project"
      description={title}
      width={mode === "choice" ? "max-w-3xl" : "max-w-4xl"}
      footer={
        mode === "choice" ? (
          <Button onClick={resetAndClose}>Cancel</Button>
        ) : (
          <>
            <Button onClick={() => mode === "guided" && step > 0 ? setStep((s) => s - 1) : setMode("choice")}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <span className="mr-auto text-sm text-danger">{error}</span>
            {mode === "guided" && step < 4 ? (
              <Button variant="primary" disabled={step === 0 && !form.name.trim()} onClick={() => setStep((s) => s + 1)}>Next <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button variant="primary" disabled={busy || !form.name.trim()} onClick={submit}>{busy ? "Creating..." : "Create"}</Button>
            )}
          </>
        )
      }
    >
      {mode === "choice" ? (
        <div className="space-y-3">
          <button className="flex w-full items-center gap-4 rounded-lg border border-hairline p-5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50" onClick={() => setMode("quick")}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Rocket className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">Quick create</span>
              <span className="mt-1 block text-sm leading-6 text-muted">Every project setting on one screen - name, region, currency, address, client, dates and budget. Only the name is required.</span>
            </span>
            <ArrowRight className="h-5 w-5 text-muted" />
          </button>
          <button className="flex w-full items-center gap-4 rounded-lg border border-hairline p-5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50" onClick={() => { setMode("guided"); setStep(0); }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-slate-700"><Sparkles className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">Guided setup</span>
              <span className="mt-1 block text-sm leading-6 text-muted">5 short steps - region, project type and scope. Pre-selects the right modules and a focused sidebar for the work you do.</span>
            </span>
            <ArrowRight className="h-5 w-5 text-muted" />
          </button>
        </div>
      ) : mode === "quick" ? (
        <QuickProjectForm form={form} update={update} clients={clients} expanded={expanded} setExpanded={setExpanded} />
      ) : (
        <GuidedProjectForm
          step={step}
          form={form}
          update={update}
          clients={clients}
          preset={preset}
          setPreset={setPreset}
          scope={scope}
          setScope={setScope}
          phases={phases}
          setPhases={setPhases}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          toggle={toggle}
        />
      )}
    </Modal>
  );
}

function QuickProjectForm({
  form, update, clients, expanded, setExpanded
}: {
  form: ProjectForm;
  update: (name: keyof ProjectForm, value: string) => void;
  clients: Client[];
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Project Name" required hint="Required">
        <Input data-autofocus value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Office Tower Downtown" />
      </Field>
      <section className="rounded-lg border border-hairline p-4">
        <button type="button" className="mb-4 flex w-full items-center justify-between text-left" onClick={() => setExpanded(!expanded)}>
          <span className="label-micro">Optional details</span>
          <span className="inline-flex items-center gap-1 text-sm text-muted">{expanded ? "Hide" : "Show"} {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </button>
        {expanded ? (
          <div className="space-y-4">
            <PanelTitle icon={FileText} title="Description & notes" subtitle="Scope, context - anything useful later. Optional." />
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder="Project description, scope, notes..." />
            <PanelTitle icon={Globe2} title="Classification & localization" subtitle="Region, standard, currency and language. Optional - editable later." />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Region" value={form.region} onChange={(v) => update("region", v)} options={GHANA_REGIONS} />
              <SelectField label="Classification Standard" value={form.standard} onChange={(v) => update("standard", v)} options={STANDARDS} />
              <SelectField label="Currency" value={form.currency} onChange={(v) => update("currency", v)} options={CURRENCIES} />
              <SelectField label="Language" value={form.language} onChange={(v) => update("language", v)} options={LANGUAGES} />
            </div>
            <PanelTitle icon={Gauge} title="Identification" subtitle="Code, type and client. Optional - auto-filled where possible." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project number / code" hint="Optional"><Input value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="Auto-generated if left blank" /></Field>
              <SelectField label="Project type" value={form.type} onChange={(v) => update("type", v)} options={TYPES} />
              <SelectField label="Client / owner" value={form.clientId} onChange={(v) => update("clientId", v)} options={clients.map((c) => c.name)} values={clients.map((c) => c.id)} className="sm:col-span-2" />
            </div>
            <AddressAndBudget form={form} update={update} />
          </div>
        ) : null}
      </section>
      <p className="text-sm leading-6 text-muted">Modules and lifecycle scope use the full-lifecycle default. Switch to guided setup to tailor them, or change everything later in Project Settings.</p>
    </div>
  );
}

function GuidedProjectForm(props: {
  step: number;
  form: ProjectForm;
  update: (name: keyof ProjectForm, value: string) => void;
  clients: Client[];
  preset: string;
  setPreset: (v: string) => void;
  scope: string[];
  setScope: (v: string[]) => void;
  phases: string[];
  setPhases: (v: string[]) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggle: (list: string[], value: string, setter: (next: string[]) => void) => void;
}) {
  const { step, form, update } = props;
  return (
    <div className="space-y-5">
      <StepRail step={step} />
      {step === 0 ? (
        <div className="space-y-3">
          <Field label="Project Name"><Input data-autofocus value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Office Tower Downtown" /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Project description, scope, notes..." /></Field>
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Region" value={form.region} onChange={(v) => update("region", v)} options={GHANA_REGIONS} />
          <SelectField label="Classification Standard" value={form.standard} onChange={(v) => update("standard", v)} options={STANDARDS} />
          <SelectField label="Currency" value={form.currency} onChange={(v) => update("currency", v)} options={CURRENCIES} />
          <SelectField label="Language" value={form.language} onChange={(v) => update("language", v)} options={LANGUAGES} />
        </div>
      ) : step === 2 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {PROJECT_PRESETS.map((option) => (
            <button
              key={option.id}
              className={`rounded-lg border p-4 text-left transition-colors ${props.preset === option.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-hairline hover:border-blue-200"}`}
              onClick={() => props.setPreset(option.id)}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold">{option.title}</span>
                {props.preset === option.id ? <Check className="h-4 w-4 text-blue-600" /> : null}
              </span>
              <span className="mt-2 block text-sm text-muted">{option.detail}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted"><Layers className="h-3.5 w-3.5" /> {option.modules} modules</span>
            </button>
          ))}
          <SelectField label="Project size" value={form.size} onChange={(v) => update("size", v)} options={["Small", "Medium", "Large", "Enterprise"]} />
          <SelectField label="Your role" value={form.role} onChange={(v) => update("role", v)} options={["General Contractor", "Quantity Surveyor", "Project Manager", "Developer", "Consultant"]} />
        </div>
      ) : step === 3 ? (
        <div className="space-y-5">
          <TagChooser title="What will you do on this project?" options={SCOPE_TAGS} selected={props.scope} onToggle={(v) => props.toggle(props.scope, v, props.setScope)} />
          <TagChooser title="Lifecycle phases in scope" options={PHASE_TAGS} selected={props.phases} onToggle={(v) => props.toggle(props.phases, v, props.setPhases)} />
          <label className="flex items-center gap-3 rounded-lg border border-hairline p-4">
            <Checkbox checked={props.focusMode} onChange={(e) => props.setFocusMode(e.currentTarget.checked)} />
            <span><span className="block font-semibold">Focus mode</span><span className="text-sm text-muted">Show a numbered, phase-grouped sidebar with off-scope modules greyed out.</span></span>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <AddressAndBudget form={form} update={update} compact />
          <div className="rounded-lg border border-hairline p-4">
            <h3 className="font-semibold">Review</h3>
            {[
              ["Project Name", form.name || "-"],
              ["Region", form.region],
              ["Currency", form.currency],
              ["Classification Standard", form.standard],
              ["Language", form.language],
              ["Regional Factor", form.regionalFactor],
              ["Project type", PROJECT_PRESETS.find((p) => p.id === props.preset)?.title ?? form.type],
              ["Your role", form.role],
              ["Project size", form.size],
              ["What will you do on this project?", String(props.scope.length)],
              ["Lifecycle phases in scope", String(props.phases.length)],
              ["Focus mode", props.focusMode ? "On" : "Off"]
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-1 text-sm"><span className="text-muted">{label}</span><span className="text-right font-medium">{value}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepRail({ step }: { step: number }) {
  const labels = ["Basics", "Region & currency", "Project type", "Project scope", "Site & review"];
  return (
    <div className="grid grid-cols-5 gap-2">
      {labels.map((label, index) => (
        <div key={label} className="text-center">
          <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${index < step ? "border-blue-600 bg-blue-600 text-white" : index === step ? "border-blue-600 bg-blue-600 text-white" : "border-hairline bg-sunken text-muted"}`}>
            {index < step ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          <p className="mt-2 text-xs text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></span>
      <span><span className="block font-semibold">{title}</span><span className="text-sm text-muted">{subtitle}</span></span>
    </div>
  );
}

function SelectField({
  label, value, onChange, options, values, className = ""
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  values?: string[];
  className?: string;
}) {
  return (
    <Field label={label} hint="Optional" className={className}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- Select {label.toLowerCase()} --</option>
        {options.map((option, i) => <option key={values?.[i] ?? option} value={values?.[i] ?? option}>{option}</option>)}
      </Select>
    </Field>
  );
}

function AddressAndBudget({ form, update, compact }: { form: ProjectForm; update: (name: keyof ProjectForm, value: string) => void; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <PanelTitle icon={MapPin} title="Site address" subtitle="Optional - enables the location map and weather forecast" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Search address" className="sm:col-span-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input className="pl-9" value={form.addressSearch} onChange={(e) => update("addressSearch", e.target.value)} placeholder="Start typing an address..." /></div>
        </Field>
        <Field label="Street & number"><Input value={form.street} onChange={(e) => update("street", e.target.value)} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => update("city", e.target.value)} /></Field>
        <Field label="Country"><Input value={form.country} onChange={(e) => update("country", e.target.value)} /></Field>
        <Field label="Postal code"><Input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></Field>
      </div>
      <PanelTitle icon={CalendarDays} title="Schedule & budget" subtitle="Dates, budget, contract value and regional cost factor. Optional." />
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
        <Field label="Planned start date"><Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field>
        <Field label="Planned end date"><Input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} /></Field>
        <Field label="Budget estimate"><Input type="number" value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="e.g. 1500000" /></Field>
        <Field label="Contract value"><Input type="number" value={form.contractValue} onChange={(e) => update("contractValue", e.target.value)} placeholder="e.g. 1800000" /></Field>
        <Field label="Regional factor"><Input type="number" step="0.01" value={form.regionalFactor} onChange={(e) => update("regionalFactor", e.target.value)} /></Field>
      </div>
    </div>
  );
}

function TagChooser({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <section>
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${active ? "border-blue-600 bg-blue-600 text-white" : "border-hairline bg-surface text-muted hover:text-fg"}`}>
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
