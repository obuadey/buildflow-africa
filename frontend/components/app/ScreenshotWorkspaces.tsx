"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle, BarChart3, Briefcase, Download, FileText, LineChart, Pencil, Plus, Search, Trash2, Upload, Wallet
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Field, Input, Select } from "../ui/Field";
import { Modal } from "../ui/Overlay";
import { MiniTable, Tabs } from "../ui/Tabs";
import { useTenantContext } from "./TenantProvider";
import { createRecord, deleteRecord, downloadCsv, patchRecord, toCsv, useList } from "../../lib/client";
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent } from "../../lib/format";
import type { DashboardChart, Expense, Invoice, Payment, Project } from "../../lib/types";

type FinanceTab = "budgets" | "invoices" | "inbox" | "payments" | "statements" | "retention" | "evm" | "connectors";
type ChartType = "number" | "bar" | "donut" | "line" | "area";
type IconComponent = React.ComponentType<{ className?: string }>;
type KpiItem = [label: string, value: ReactNode, icon: IconComponent, tone: string, detail?: ReactNode];

const FINANCE_TABS: { value: FinanceTab; label: string }[] = [
  { value: "budgets", label: "Budgets" },
  { value: "invoices", label: "Invoices" },
  { value: "inbox", label: "Invoice inbox" },
  { value: "payments", label: "Payments" },
  { value: "statements", label: "Statements" },
  { value: "retention", label: "Retention" },
  { value: "evm", label: "Earned Value Management" },
  { value: "connectors", label: "Connectors" }
];

export function AnalyticsWorkspace() {
  const { tenant } = useTenantContext();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const { rows: projects } = useList<Project>("projects", { size: 200 });

  const rows = projects.filter((project) =>
    project.name.toLowerCase().includes(query.toLowerCase()) &&
    (region === "all" || project.region === region) &&
    (status === "all" || project.status === status)
  );
  const totalBudget = rows.reduce((sum, p) => sum + p.contractValue, 0);
  const totalActual = rows.reduce((sum, p) => sum + p.cost, 0);
  const regions = Array.from(new Set(projects.map((p) => p.region)));
  const statuses = Array.from(new Set(projects.map((p) => p.status)));

  return (
    <WorkspaceFrame
      description="Aggregated KPIs across all projects."
      actions={<><Button size="sm" onClick={() => exportProjects(rows)}><Download className="h-4 w-4" /> Export CSV</Button></>}
    >
      <KpiGrid items={[
        ["Total Projects", rows.length, Briefcase, "info", `${rows.filter((p) => p.contractValue > 0).length} with budget`],
        ["Total Budget", formatMoneyCompact(totalBudget, tenant.currency), Wallet, "success", `${formatMoneyCompact(totalActual, tenant.currency)} actual`],
        ["Overall Variance", formatMoneyCompact(totalBudget - totalActual, tenant.currency), LineChart, "success", totalBudget ? formatPercent(((totalBudget - totalActual) / totalBudget) * 100) : ""],
        ["Projects at Risk", rows.filter((p) => p.health !== "ON_TRACK").length, AlertTriangle, "success", "over budget"]
      ]} />
      <Card>
        <CardHeader title="Project Comparison" action={<span className="text-xs text-muted">{rows.length} of {projects.length}</span>} />
        <div className="grid gap-2 border-b border-hairline p-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
          <label className="flex h-9 items-center gap-2 rounded border border-hairline px-3"><Search className="h-4 w-4 text-subtle" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search projects..." /></label>
          <Select value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">All Regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All Statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</Select>
        </div>
        <MiniTable
          head={["Project", "Region", "Budget", "Actual", "Variance", "Var. %", "Status"]}
          rows={rows.map((p) => {
            const variance = p.contractValue - p.cost;
            return [p.name, p.region, formatMoney(p.contractValue, tenant.currency, 0), formatMoney(p.cost, tenant.currency, 0), <span key="v" className={variance >= 0 ? "text-success" : "text-danger"}>{formatMoney(variance, tenant.currency, 0)}</span>, p.contractValue ? formatPercent((variance / p.contractValue) * 100) : "", <Badge key="s" tone={variance >= 0 ? "success" : "danger"}>{variance >= 0 ? "On Budget" : "Over Budget"}</Badge>];
          })}
        />
      </Card>
      <BudgetBreakdown projects={rows} currency={tenant.currency} />
    </WorkspaceFrame>
  );
}

export function FinanceWorkspace() {
  const { tenant } = useTenantContext();
  const [tab, setTab] = useState<FinanceTab>("budgets");
  const [chartOpen, setChartOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<DashboardChart | null>(null);
  const { rows: projects } = useList<Project>("projects", { size: 200 });
  const { rows: invoices } = useList<Invoice>("invoices", { size: 200 });
  const { rows: payments } = useList<Payment>("payments", { size: 500 });
  const { rows: expenses } = useList<Expense>("expenses", { size: 500 });
  const { rows: charts, loading: chartsLoading, refresh: refreshCharts } = useList<DashboardChart>("dashboardCharts", { scope: "finance", size: 100 });
  const chartData = useMemo(() => ({ invoices, payments, expenses, projects }), [expenses, invoices, payments, projects]);

  const totalBudget = projects.reduce((sum, p) => sum + p.contractValue, 0);
  const committed = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paid = invoices.reduce((sum, i) => sum + i.paid, 0);
  const outstanding = invoices.reduce((sum, i) => sum + Math.max(0, i.total - i.paid), 0);

  return (
    <WorkspaceFrame description="Track budgets, invoices, and earned value." actions={<><Button size="sm" onClick={() => setChartOpen(true)}><BarChart3 className="h-4 w-4" /> Insights</Button></>}>
      <Card>
        <CardHeader title="Invoice insights" subtitle="Live charts from this module." action={<Button size="sm" onClick={() => setChartOpen(true)}><Plus className="h-4 w-4" /> New chart</Button>} />
        <div className="grid gap-3 p-3 lg:grid-cols-2 xl:grid-cols-3">
          {chartsLoading ? <ChartLoading /> : null}
          {!chartsLoading && charts.length === 0 ? (
            <EmptyPanel
              compact
              title="No charts yet"
              detail="Create a chart from invoices, payments, expenses or project data."
              action={<Button variant="primary" onClick={() => setChartOpen(true)}><Plus className="h-4 w-4" /> New chart</Button>}
            />
          ) : null}
          {charts.map((chart) => (
            <ChartCard
              key={chart.id}
              chart={chart}
              currency={tenant.currency}
              data={chartData}
              onEdit={() => { setEditingChart(chart); setChartOpen(true); }}
              onDelete={async () => {
                if (!window.confirm(`Delete "${chart.title}"?`)) return;
                await deleteRecord(tenant.slug, "dashboardCharts", chart.id);
                refreshCharts();
              }}
            />
          ))}
        </div>
      </Card>
      <KpiGrid items={[
        ["Total Budget", formatMoney(totalBudget, tenant.currency, 0), Wallet, "info"],
        ["Total Invoiced (Payable)", formatMoney(outstanding, tenant.currency, 0), FileText, "warning"],
        ["Receivable", formatMoney(paid, tenant.currency, 0), Briefcase, "success"],
        ["Remaining Budget", formatMoney(Math.max(0, totalBudget - committed), tenant.currency, 0), Wallet, "success"]
      ]} />
      <ProgressBar label="Budget consumed" value={totalBudget ? (committed / totalBudget) * 100 : 0} />
      <Tabs value={tab} onChange={setTab} tabs={FINANCE_TABS} />
      {tab === "budgets" ? <BudgetLines projects={projects} currency={tenant.currency} /> : null}
      {tab === "invoices" ? <InvoiceTable invoices={invoices} currency={tenant.currency} /> : null}
      {tab === "inbox" ? <InboxPanel /> : null}
      {tab === "payments" ? <EmptyPanel title="No payments" detail="Payments will appear here once recorded." action={<Button variant="primary" onClick={() => setTab("invoices")}>Go to Invoices</Button>} /> : null}
      {tab === "statements" ? <EmptyPanel title="No ledger activity" detail="Post invoices to the ledger from the invoice inbox to populate statements." /> : null}
      {tab === "retention" ? <RetentionPanel currency={tenant.currency} /> : null}
      {tab === "evm" ? <EvmPanel projects={projects} currency={tenant.currency} /> : null}
      {tab === "connectors" ? <EmptyPanel title="No finance connectors" detail="Connect accounting and payment systems when they are available for this tenant." /> : null}
      <NewChartModal
        open={chartOpen}
        onClose={() => { setChartOpen(false); setEditingChart(null); }}
        slug={tenant.slug}
        currency={tenant.currency}
        data={chartData}
        chart={editingChart}
        onSaved={refreshCharts}
      />
    </WorkspaceFrame>
  );
}

function WorkspaceFrame({ description, actions, children }: { description: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid-rule -m-4 min-h-[calc(100vh-56px)] space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{description}</p>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, Icon, tone, detail]) => (
        <Card key={String(label)} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <IconTile icon={Icon} tone={tone} />
            <div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="num mt-1 truncate text-xl font-semibold">{value}</p>{detail ? <p className="text-xs text-muted">{detail}</p> : null}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function IconTile({ icon: Icon, tone = "neutral" }: { icon: React.ComponentType<{ className?: string }>; tone?: string }) {
  const cls = tone === "success" ? "bg-emerald-100 text-emerald-700" : tone === "danger" ? "bg-red-100 text-red-700" : tone === "warning" ? "bg-amber-100 text-amber-700" : tone === "info" ? "bg-blue-100 text-blue-700" : "bg-sunken text-muted";
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></span>;
}

function MetricBand({ title, values }: { title: string; values: [string, number][] }) {
  return <Card className="p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 grid gap-3 sm:grid-cols-4">{values.map(([label, value]) => <div key={label}><p className="text-xs text-muted">{label}</p><p className="num mt-1 text-xl font-semibold">{value}</p></div>)}</div></Card>;
}

function FinanceSummary({ invoices, projects, currency }: { invoices: Invoice[]; projects: Project[]; currency: string }) {
  return <MetricBand title="Commitment Summary" values={[["Invoices", invoices.length], ["Committed", Math.round(projects.reduce((s, p) => s + p.cost, 0) / 1000)], ["Pending", 3], ["Approved", 3]]} />;
}

function EmptyPanel({ title, detail, compact, action }: { title: string; detail: string; compact?: boolean; action?: ReactNode }) {
  return <Card className={`flex flex-col items-center justify-center p-8 text-center ${compact ? "min-h-[220px]" : "min-h-[320px]"}`}><IconTile icon={FileText} /><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 max-w-md text-sm text-muted">{detail}</p>{action ? <div className="mt-4">{action}</div> : null}</Card>;
}

function BudgetBreakdown({ projects, currency }: { projects: Project[]; currency: string }) {
  const max = Math.max(...projects.map((p) => p.contractValue), 1);
  return <Card className="p-4"><h2 className="font-semibold">Budget Breakdown</h2><div className="mt-4 space-y-4">{projects.map((p) => <div key={p.id}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{p.name}</span><span className="num text-muted">{formatMoney(p.contractValue, currency, 0)}</span></div><div className="h-5 rounded bg-sunken"><div className="h-full rounded bg-blue-500 text-[10px] leading-5 text-white" style={{ width: `${Math.max(3, (p.cost / max) * 100)}%` }}>Actual: {formatMoney(p.cost, currency, 0)}</div></div></div>)}</div></Card>;
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return <Card className="p-3"><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="num font-semibold">{formatPercent(value)}</span></div><div className="h-2 rounded bg-sunken"><div className="h-full rounded bg-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></Card>;
}

type FinanceChartData = { invoices: Invoice[]; payments: Payment[]; expenses: Expense[]; projects: Project[] };
type ChartRow = Record<string, string | number | boolean | undefined>;
type ChartPoint = { label: string; value: number };

const DATASET_OPTIONS = [
  { value: "invoices", label: "Invoices" },
  { value: "payments", label: "Payments" },
  { value: "expenses", label: "Expenses" },
  { value: "projects", label: "Projects" }
] as const;

const MEASURE_OPTIONS: Record<DashboardChart["dataset"], { value: string; label: string; money?: boolean }[]> = {
  invoices: [
    { value: "total", label: "Invoice total", money: true },
    { value: "paid", label: "Paid", money: true },
    { value: "outstanding", label: "Outstanding", money: true },
    { value: "count", label: "Count" }
  ],
  payments: [
    { value: "amount", label: "Payment amount", money: true },
    { value: "count", label: "Count" }
  ],
  expenses: [
    { value: "amount", label: "Expense amount", money: true },
    { value: "count", label: "Count" }
  ],
  projects: [
    { value: "contractValue", label: "Contract value", money: true },
    { value: "cost", label: "Cost", money: true },
    { value: "profit", label: "Profit", money: true },
    { value: "completion", label: "Completion %" },
    { value: "count", label: "Count" }
  ]
};

const GROUP_OPTIONS: Record<DashboardChart["dataset"], { value: string; label: string }[]> = {
  invoices: [
    { value: "client", label: "Client" },
    { value: "project", label: "Project" },
    { value: "status", label: "Status" },
    { value: "type", label: "Type" },
    { value: "issueMonth", label: "Issue month" },
    { value: "dueMonth", label: "Due month" }
  ],
  payments: [
    { value: "client", label: "Client" },
    { value: "project", label: "Project" },
    { value: "method", label: "Method" },
    { value: "paidMonth", label: "Paid month" },
    { value: "recordedBy", label: "Recorded by" }
  ],
  expenses: [
    { value: "project", label: "Project" },
    { value: "category", label: "Category" },
    { value: "vendor", label: "Vendor" },
    { value: "spentMonth", label: "Spent month" },
    { value: "receipt", label: "Receipt" }
  ],
  projects: [
    { value: "status", label: "Status" },
    { value: "health", label: "Health" },
    { value: "region", label: "Region" },
    { value: "city", label: "City" },
    { value: "manager", label: "Manager" },
    { value: "startMonth", label: "Start month" }
  ]
};

const AGGREGATIONS = [
  { value: "sum", label: "Sum" },
  { value: "count", label: "Count" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" }
] as const;

function ChartLoading() {
  return <Card className="min-h-[240px] p-3"><div className="h-5 w-40 rounded bg-sunken" /><div className="mt-8 h-36 rounded bg-sunken" /></Card>;
}

function ChartCard({ chart, data, currency, onEdit, onDelete }: {
  chart: DashboardChart; data: FinanceChartData; currency: string; onEdit: () => void; onDelete: () => void;
}) {
  const series = buildChartSeries(chart, data);
  return (
    <Card className="flex min-h-[240px] flex-col p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-muted" /> <span className="truncate">{chart.title}</span></p>
          <p className="mt-1 text-xs text-muted">{labelFor(DATASET_OPTIONS, chart.dataset)} · {labelFor(MEASURE_OPTIONS[chart.dataset], chart.measure)} by {labelFor(GROUP_OPTIONS[chart.dataset], chart.groupBy)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1">
        <ChartVisual chart={chart} series={series} currency={currency} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2 text-xs text-muted">
        <span>{series.length} point{series.length === 1 ? "" : "s"}</span>
        <span className="capitalize">{chart.aggregation} · {chart.sortDir}</span>
      </div>
    </Card>
  );
}

function ChartVisual({ chart, series, currency }: { chart: DashboardChart; series: ChartPoint[]; currency: string }) {
  if (!series.length) return <div className="flex h-40 items-center justify-center text-sm text-muted">No matching records</div>;
  const money = MEASURE_OPTIONS[chart.dataset].find((m) => m.value === chart.measure)?.money;
  const formatValue = (value: number) => money ? formatMoneyCompact(value, currency) : formatNumber(Math.round(value * 100) / 100);
  const max = Math.max(...series.map((point) => Math.abs(point.value)), 1);

  if (chart.chartType === "number") {
    const total = series.reduce((sum, point) => sum + point.value, 0);
    return <div className="flex h-40 flex-col justify-center rounded-lg bg-sunken p-4"><p className="num text-4xl font-semibold">{formatValue(total)}</p><p className="mt-2 text-sm text-muted">Across {series.length} grouped value{series.length === 1 ? "" : "s"}</p></div>;
  }

  if (chart.chartType === "donut") {
    return (
      <div className="grid h-40 grid-cols-[132px_minmax(0,1fr)] items-center gap-3">
        <div className="h-32 w-32 rounded-full" style={{ background: donutGradient(series) }} />
        <ul className="min-w-0 space-y-1.5">
          {series.slice(0, 5).map((point, index) => (
            <li key={point.label} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
              <span className="min-w-0 flex-1 truncate">{point.label}</span>
              <span className="num font-medium">{formatValue(point.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (chart.chartType === "line" || chart.chartType === "area") {
    const points = series.map((point, index) => {
      const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 100 - (Math.max(0, point.value) / max) * 86 - 7;
      return `${x},${y}`;
    });
    return (
      <div className="h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-36 w-full overflow-visible border-b border-l border-hairline">
          {chart.chartType === "area" ? <polygon points={`0,100 ${points.join(" ")} 100,100`} fill="rgb(var(--info) / 0.16)" /> : null}
          <polyline points={points.join(" ")} fill="none" stroke="rgb(var(--info))" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-2 grid gap-1 text-2xs text-muted" style={{ gridTemplateColumns: `repeat(${Math.min(series.length, 4)}, minmax(0,1fr))` }}>
          {series.slice(0, 4).map((point) => <span key={point.label} className="truncate">{point.label}</span>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-44 items-end gap-2 border-b border-l border-hairline px-2 pt-4">
      {series.map((point, index) => (
        <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t bg-info" style={{ height: `${Math.max(4, (Math.max(0, point.value) / max) * 132)}px`, background: CHART_COLORS[index % CHART_COLORS.length] }} title={`${point.label}: ${formatValue(point.value)}`} />
          <span className="w-full truncate text-center text-2xs text-muted">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function NewChartModal({ open, onClose, slug, currency, data, chart, onSaved }: {
  open: boolean; onClose: () => void; slug: string; currency: string; data: FinanceChartData;
  chart?: DashboardChart | null; onSaved: () => void;
}) {
  const [dataset, setDataset] = useState<DashboardChart["dataset"]>(chart?.dataset ?? "invoices");
  const [chartType, setChartType] = useState<ChartType>(chart?.chartType ?? "bar");
  const [measure, setMeasure] = useState(chart?.measure ?? "total");
  const [groupBy, setGroupBy] = useState(chart?.groupBy ?? "client");
  const [aggregation, setAggregation] = useState<DashboardChart["aggregation"]>(chart?.aggregation ?? "sum");
  const [statusFilter, setStatusFilter] = useState(chart?.statusFilter ?? "");
  const [projectFilter, setProjectFilter] = useState(chart?.projectFilter ?? "");
  const [limitCount, setLimitCount] = useState(String(chart?.limitCount ?? 8));
  const [sortDir, setSortDir] = useState<DashboardChart["sortDir"]>(chart?.sortDir ?? "desc");
  const [title, setTitle] = useState(chart?.title ?? defaultChartTitle("sum", "total", "client", "invoices"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextDataset = chart?.dataset ?? "invoices";
    setDataset(nextDataset);
    setChartType(chart?.chartType ?? "bar");
    setMeasure(chart?.measure ?? MEASURE_OPTIONS[nextDataset][0].value);
    setGroupBy(chart?.groupBy ?? GROUP_OPTIONS[nextDataset][0].value);
    setAggregation(chart?.aggregation ?? "sum");
    setStatusFilter(chart?.statusFilter ?? "");
    setProjectFilter(chart?.projectFilter ?? "");
    setLimitCount(String(chart?.limitCount ?? 8));
    setSortDir(chart?.sortDir ?? "desc");
    setTitle(chart?.title ?? defaultChartTitle("sum", MEASURE_OPTIONS[nextDataset][0].value, GROUP_OPTIONS[nextDataset][0].value, nextDataset));
  }, [chart, open]);

  const draft = useMemo<DashboardChart>(() => ({
    id: chart?.id ?? "preview",
    scope: "finance",
    title,
    chartType,
    dataset,
    measure,
    groupBy,
    aggregation,
    limitCount: Number(limitCount) || 8,
    sortDir,
    stacked: false,
    createdAt: chart?.createdAt ?? new Date().toISOString(),
    updatedAt: chart?.updatedAt ?? new Date().toISOString(),
    statusFilter: statusFilter || undefined,
    projectFilter: projectFilter || undefined
  }), [aggregation, chart, chartType, dataset, groupBy, limitCount, measure, projectFilter, sortDir, statusFilter, title]);

  const statuses = distinctValues(rowsForDataset(dataset, data), "status");
  const projects = distinctValues(rowsForDataset(dataset, data), "project");

  function changeDataset(next: DashboardChart["dataset"]) {
    setDataset(next);
    const nextMeasure = MEASURE_OPTIONS[next][0].value;
    const nextGroup = GROUP_OPTIONS[next][0].value;
    setMeasure(nextMeasure);
    setGroupBy(nextGroup);
    setStatusFilter("");
    setProjectFilter("");
    setTitle(defaultChartTitle(aggregation, nextMeasure, nextGroup, next));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        scope: "finance",
        title,
        chartType,
        dataset,
        measure,
        groupBy,
        aggregation,
        statusFilter: statusFilter || undefined,
        projectFilter: projectFilter || undefined,
        limitCount: Number(limitCount) || 8,
        sortDir,
        stacked: false
      };
      if (chart) {
        await patchRecord(slug, "dashboardCharts", chart.id, body);
      } else {
        await createRecord(slug, "dashboardCharts", body);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as { message?: string }).message ?? "The chart could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={chart ? "Edit chart" : "New chart"} description="Pick the source data, aggregation and visual style." width="max-w-5xl">
      <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]" onSubmit={submit}>
        <div className="space-y-3">
          <div>
            <p className="label-micro mb-2">Chart type</p>
            <div className="grid grid-cols-5 gap-2">
              {(["number", "bar", "donut", "line", "area"] as ChartType[]).map((item) => (
                <button key={item} type="button" onClick={() => setChartType(item)} className={`rounded border p-3 text-sm capitalize ${chartType === item ? "border-accent bg-accent/10 text-accent" : "border-hairline hover:bg-sunken"}`}>{item}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dataset">
              <Select value={dataset} onChange={(e) => changeDataset(e.target.value as DashboardChart["dataset"])}>
                {DATASET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="Aggregation">
              <Select value={aggregation} onChange={(e) => setAggregation(e.target.value as DashboardChart["aggregation"])}>
                {AGGREGATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Measure">
              <Select value={measure} onChange={(e) => { setMeasure(e.target.value); setTitle(defaultChartTitle(aggregation, e.target.value, groupBy, dataset)); }}>
                {MEASURE_OPTIONS[dataset].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="Group by">
              <Select value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setTitle(defaultChartTitle(aggregation, measure, e.target.value, dataset)); }}>
                {GROUP_OPTIONS[dataset].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status filter">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </Field>
            <Field label="Project filter">
              <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="">All projects</option>
                {projects.map((project) => <option key={project} value={project}>{project}</option>)}
              </Select>
            </Field>
            <Field label="Sort">
              <Select value={sortDir} onChange={(e) => setSortDir(e.target.value as DashboardChart["sortDir"])}>
                <option value="desc">High to low</option>
                <option value="asc">Low to high</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <Field label="Limit"><Input type="number" min="1" max="20" value={limitCount} onChange={(e) => setLimitCount(e.target.value)} /></Field>
            <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          </div>
          {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving..." : chart ? "Save chart" : "Add chart"}</Button>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-hairline p-4">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted">Live preview from current dashboard data</p>
          <div className="mt-4"><ChartVisual chart={draft} series={buildChartSeries(draft, data)} currency={currency} /></div>
        </div>
      </form>
    </Modal>
  );
}

const CHART_COLORS = ["#2563EB", "#0EA5E9", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#64748B", "#14B8A6"];

function buildChartSeries(chart: DashboardChart, data: FinanceChartData): ChartPoint[] {
  const rows = rowsForDataset(chart.dataset, data)
    .filter((row) => !chart.statusFilter || row.status === chart.statusFilter)
    .filter((row) => !chart.projectFilter || row.project === chart.projectFilter);
  const buckets = new Map<string, number[]>();
  rows.forEach((row) => {
    const label = String(row[chart.groupBy] ?? "Unassigned");
    const value = chart.measure === "count" || chart.aggregation === "count" ? 1 : Number(row[chart.measure] ?? 0);
    buckets.set(label, [...(buckets.get(label) ?? []), Number.isFinite(value) ? value : 0]);
  });
  return Array.from(buckets.entries())
    .map(([label, values]) => ({ label, value: aggregate(values, chart.aggregation) }))
    .sort((a, b) => chart.sortDir === "asc" ? a.value - b.value : b.value - a.value)
    .slice(0, Math.max(1, chart.limitCount));
}

function rowsForDataset(dataset: DashboardChart["dataset"], data: FinanceChartData): ChartRow[] {
  if (dataset === "invoices") {
    return data.invoices.map((row) => ({
      total: row.total,
      paid: row.paid,
      outstanding: Math.max(0, row.total - row.paid),
      count: 1,
      client: row.clientName,
      project: row.projectName,
      status: row.status,
      type: row.type,
      issueMonth: monthLabel(row.issueDate),
      dueMonth: monthLabel(row.dueDate)
    }));
  }
  if (dataset === "payments") {
    return data.payments.map((row) => ({
      amount: row.amount,
      count: 1,
      client: row.clientName,
      project: row.projectName,
      method: row.method,
      recordedBy: row.recordedBy,
      paidMonth: monthLabel(row.date)
    }));
  }
  if (dataset === "expenses") {
    return data.expenses.map((row) => ({
      amount: row.amount,
      count: 1,
      project: row.projectName,
      category: row.category,
      vendor: row.vendor,
      receipt: row.receipt ? "With receipt" : "Missing receipt",
      spentMonth: monthLabel(row.date)
    }));
  }
  return data.projects.map((row) => ({
    contractValue: row.contractValue,
    cost: row.cost,
    profit: row.contractValue - row.cost,
    completion: row.completion,
    count: 1,
    project: row.name,
    status: row.status,
    health: row.health,
    region: row.region,
    city: row.city,
    manager: row.manager,
    startMonth: monthLabel(row.startDate)
  }));
}

function aggregate(values: number[], mode: DashboardChart["aggregation"]) {
  if (!values.length) return 0;
  if (mode === "count") return values.length;
  if (mode === "avg") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mode === "min") return Math.min(...values);
  if (mode === "max") return Math.max(...values);
  return values.reduce((sum, value) => sum + value, 0);
}

function distinctValues(rows: ChartRow[], key: string) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean).map(String))).sort();
}

function monthLabel(value?: string) {
  if (!value) return "No date";
  return value.slice(0, 7);
}

function donutGradient(series: ChartPoint[]) {
  const total = series.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1;
  let start = 0;
  const stops = series.map((point, index) => {
    const pct = (Math.max(0, point.value) / total) * 100;
    const end = start + pct;
    const stop = `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function labelFor(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function defaultChartTitle(aggregation: string, measure: string, groupBy: string, dataset: DashboardChart["dataset"]) {
  return `${labelFor(AGGREGATIONS, aggregation)} ${labelFor(MEASURE_OPTIONS[dataset], measure)} by ${labelFor(GROUP_OPTIONS[dataset], groupBy)}`;
}

function BudgetLines({ projects, currency }: { projects: Project[]; currency: string }) {
  return <Card><CardHeader title="Project budget tracks original vs actual costs by WBS category." action={<Button size="sm"><Plus className="h-4 w-4" /> New Budget Line</Button>} /><MiniTable head={["WBS", "Category", "Original", "Revised", "Committed", "Actual", "Forecast", "Variance"]} rows={projects.slice(0, 6).map((p, i) => ["", ["Interior Finishes", "MEP Systems", "Medical Equipment", "Structure", "Site & Foundation"][i % 5], formatMoney(p.contractValue, currency, 0), formatMoney(p.contractValue * 1.03, currency, 0), formatMoney(p.cost * 0.8, currency, 0), formatMoney(p.cost, currency, 0), formatMoney(p.contractValue * 1.02, currency, 0), <span key="v" className="text-success">{formatMoney(p.contractValue - p.cost, currency, 0)}</span>])} /></Card>;
}

function InvoiceTable({ invoices, currency }: { invoices: Invoice[]; currency: string }) {
  return <Card><CardHeader title="Track all project invoices in one place." action={<Button size="sm" variant="primary"><Plus className="h-4 w-4" /> New Invoice</Button>} /><MiniTable head={["Invoice #", "Vendor", "Issue Date", "Due Date", "Amount", "Status"]} rows={invoices.map((i) => [i.id, i.clientName, i.issueDate, i.dueDate, formatMoney(i.total, currency, 0), <Badge key="s">{i.status}</Badge>])} /></Card>;
}

function InboxPanel() {
  return <><Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Invoice inbox</h2><p className="text-sm text-muted">Capture invoices, review extracted fields, route approvals, and post to ledger.</p></div><Button variant="primary"><Upload className="h-4 w-4" /> Upload invoice</Button></div></Card><EmptyPanel title="No captured invoices yet" detail="Upload an invoice PDF or image to get started." compact /></>;
}

function RetentionPanel({ currency }: { currency: string }) {
  return <Card><CardHeader title="Retention" subtitle="Released as contractual milestones are reached." /><MiniTable head={["Counterparty", "Direction", "Held to Date", "Released", "Outstanding", "Payments"]} rows={[["Unspecified counterparty", <Badge key="p" tone="warning">Payable</Badge>, formatMoney(0, currency), formatMoney(0, currency), formatMoney(0, currency), "0"]]} /></Card>;
}

function EvmPanel({ projects, currency }: { projects: Project[]; currency: string }) {
  const bac = projects.reduce((sum, p) => sum + p.contractValue, 0);
  const ac = projects.reduce((sum, p) => sum + p.cost, 0);
  const ev = projects.reduce((sum, p) => sum + (p.contractValue * p.completion) / 100, 0);
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["BAC", bac], ["PV", bac], ["EV", ev], ["AC", ac], ["SPI", 0.6], ["CPI", ac ? ev / ac : 0], ["SV", ev - bac], ["CV", ev - ac]].map(([label, value]) => <Card key={String(label)} className="p-4"><p className="label-micro">{label}</p><p className="num mt-2 text-2xl font-semibold">{typeof value === "number" && Math.abs(value) > 100 ? formatMoney(value, currency, 0) : Number(value).toFixed(2)}</p></Card>)}</div>;
}

function exportProjects(rows: Project[]) {
  downloadCsv("project-analytics.csv", toCsv(rows as unknown as Record<string, unknown>[], [
    { key: "name", label: "Project" }, { key: "region", label: "Region" }, { key: "contractValue", label: "Budget" }, { key: "cost", label: "Actual" }, { key: "status", label: "Status" }
  ]));
}
