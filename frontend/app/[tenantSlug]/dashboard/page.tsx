"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Boxes, CalendarDays, CheckCircle2,
  CircleAlert, Database, FileText, FolderOpen, Gauge, Inbox,
  Layers, Sparkles, TrendingUp, Upload
} from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Badge, Delta, StatusBadge } from "../../../components/ui/Badge";
import { Button, ButtonLink } from "../../../components/ui/Button";
import { SegmentedControl, Select } from "../../../components/ui/Field";
import { Progress } from "../../../components/ui/Misc";
import { Skeleton, SkeletonText } from "../../../components/ui/Skeleton";
import { CashflowChart, RevenueChart } from "../../../components/ui/Charts";
import { useList, useSummary } from "../../../lib/client";
import { formatMoney, formatMoneyCompact, formatPercent, formatRelative, humanize, dueLabel } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Activity, Estimate, Insight, Invoice, Notification, Project } from "../../../lib/types";

const RANGES = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" }
];

const GETTING_STARTED = [
  { title: "Create Project", detail: "Start your first construction estimation project.", status: "New Project", icon: FolderOpen, href: "/projects?new=1" },
  { title: "Build Your BOQ", detail: "Create a Bill of Quantities from your project scope.", status: "New estimate", icon: FileText, href: "/estimates/new" },
  { title: "Invite Your Team", detail: "Assign teammates to projects and finance workflows.", status: "Invite", icon: Gauge, href: "/settings/users" }
];

const NEXT_STEPS = [
  { title: "Add your team contacts", detail: "Invite teammates and assign roles for project work.", icon: FolderOpen, href: "/settings/users" },
  { title: "Create a detailed estimate", detail: "Build a structured BOQ from your project quantities and rates.", icon: FileText, href: "/estimates/new" }
];

export default function DashboardPage() {
  const { tenant, user } = useTenantContext();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const [range, setRange] = useState("this-month");
  const [projectFilter, setProjectFilter] = useState("");
  const { data, loading } = useSummary(range, projectFilter || undefined);
  const currency = tenant.currency;

  const { rows: projects } = useList<Project>("projects", { size: 100, sort: "contractValue" });
  const { rows: invoices } = useList<Invoice>("invoices", { status: "OVERDUE,PARTIALLY_PAID,SENT", size: 6, sort: "dueDate", dir: "asc" });
  const { rows: estimates } = useList<Estimate>("estimates", { size: 5, sort: "updatedAt" });
  const { rows: insights } = useList<Insight>("insights", { size: 5 });
  const { total: teamSize } = useList("team", { size: 1 });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const profitable = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status === "ACTIVE" || p.status === "COMPLETED")
        .map((p) => ({ ...p, profit: p.contractValue - p.cost, margin: p.contractValue ? ((p.contractValue - p.cost) / p.contractValue) * 100 : 0 }))
        .sort((a, b) => b.contractValue - a.contractValue)
        .slice(0, 6),
    [projects]
  );

  const attention = useMemo(
    () => projects.filter((p) => p.health === "AT_RISK" || p.health === "DELAYED").slice(0, 3),
    [projects]
  );

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description={`${greeting}, ${user.name.split(" ")[0]}. Here is how ${tenant.name} is performing.`}
        actions={
          <>
            <Select
              aria-label="Filter by project"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-auto min-w-[168px]"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <SegmentedControl value={range} onChange={setRange} options={RANGES} />
          </>
        }
      />

      <ContinueWork path={path} estimates={estimates} currency={currency} />
      <PortfolioStrip data={data} loading={loading} currency={currency} projectCount={projects.length} estimateCount={estimates.length} estimates={estimates} />

      <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
        <FinanceSummary currency={currency} path={path} invoices={invoices} />
        <InboxAndUpload path={path} />
      </section>

      <RecentProjectsGrid path={path} projects={projects} currency={currency} />
      <GettingStarted path={path} projects={projects.length} estimates={estimates.length} team={teamSize} />
      <SuggestedNextSteps path={path} />

      <section aria-label="Key performance indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          label="Revenue" loading={loading} href={path("/invoices")}
          value={formatMoney(data?.kpis.revenue.value, currency, 0)}
          foot={data ? <><Delta value={data.kpis.revenue.delta} /> <span className="text-muted">vs previous period</span></> : null}
        />
        <Kpi
          label="Outstanding" loading={loading} href={path("/invoices?status=OVERDUE,PARTIALLY_PAID,SENT")}
          value={formatMoney(data?.kpis.outstanding.value, currency, 0)}
          foot={<span className="num text-muted">{data?.kpis.outstanding.count ?? 0} open invoices</span>}
        />
        <Kpi
          label="Active projects" loading={loading} href={path("/projects?status=ACTIVE")}
          value={String(data?.kpis.activeProjects.value ?? 0)}
          foot={
            data?.kpis.activeProjects.behind
              ? <span className="flex items-center gap-1 text-warning"><AlertTriangle className="h-3.5 w-3.5" />{data.kpis.activeProjects.behind} need attention</span>
              : <span className="text-muted">All on track</span>
          }
        />
        <Kpi
          label="Quote win rate" loading={loading} href={path("/quotations")}
          value={formatPercent(data?.kpis.winRate.value)}
          foot={data ? <><Delta value={data.kpis.winRate.delta} /> <span className="text-muted">vs previous period</span></> : null}
        />
        <Kpi
          label="Gross profit" loading={loading} href={path("/dashboard")}
          value={formatMoney(data?.kpis.grossProfit.value, currency, 0)}
          foot={<span className="num text-muted">{formatPercent(data?.kpis.grossProfit.margin)} margin</span>}
        />
        <Kpi
          label="Cash collected" loading={loading} href={path("/payments")}
          value={formatMoney(data?.kpis.cashCollected.value, currency, 0)}
          foot={data ? <><Delta value={data.kpis.cashCollected.delta} /> <span className="text-muted">vs previous period</span></> : null}
        />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue, cost and profit"
            subtitle="Last 12 months, from issued invoices and recorded expenses"
            action={
              <span className="hidden items-center gap-3 text-xs text-muted sm:flex">
                <Legend color="var(--legend-rev)" label="Revenue" />
                <Legend color="var(--legend-cost)" label="Cost" />
                <Legend color="var(--legend-profit)" label="Profit" />
              </span>
            }
          />
          <div className="p-2 pr-4" style={{ ["--legend-rev" as string]: "#2563EB", ["--legend-cost" as string]: "#C2571F", ["--legend-profit" as string]: "#0EA5E9" }}>
            {loading || !data ? <Skeleton className="m-2 h-[244px]" /> : <RevenueChart data={data.trend} currency={currency} />}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quote pipeline" subtitle="Open and decided quotations by stage" />
          <ul className="divide-y divide-hairline">
            {(data?.pipeline ?? []).map((stage) => {
              const max = Math.max(...(data?.pipeline ?? []).map((s) => s.value), 1);
              return (
                <li key={stage.stage}>
                  <Link
                    href={path(`/quotations?status=${stage.stage}`)}
                    className="block px-4 py-2.5 transition-colors hover:bg-sunken"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <StatusBadge status={stage.stage} />
                        <span className="num text-sm text-muted">{stage.count}</span>
                      </span>
                      <span className="num text-sm font-medium">{formatMoneyCompact(stage.value, currency)}</span>
                    </span>
                    <Progress className="mt-1.5" value={(stage.value / max) * 100} tone={stage.stage === "ACCEPTED" ? "brand" : stage.stage === "REJECTED" ? "danger" : "neutral"} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Project health"
            subtitle="Delivery status across the portfolio"
            action={<ButtonLink size="sm" href={path("/projects")}>All projects</ButtonLink>}
          />
          <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
            {[
              ["On track", data?.health.onTrack ?? 0, "ON_TRACK"],
              ["At risk", data?.health.atRisk ?? 0, "AT_RISK"],
              ["Delayed", data?.health.delayed ?? 0, "DELAYED"],
              ["Completed", data?.health.completed ?? 0, "COMPLETED"]
            ].map(([label, value, status]) => (
              <Link key={String(label)} href={path(`/projects?health=${status}`)} className="bg-surface px-4 py-3 transition-colors hover:bg-sunken">
                <p className="label-micro">{label}</p>
                <p className="num mt-1 text-3xl font-semibold">{value as number}</p>
              </Link>
            ))}
          </div>
          {attention.length ? (
            <div className="border-t border-hairline">
              <p className="label-micro px-4 pb-1 pt-3">Needs attention</p>
              <ul className="divide-y divide-hairline">
                {attention.map((p) => (
                  <li key={p.id}>
                    <Link href={path(`/projects/${p.id}`)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sunken">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium">{p.name}</span>
                        <span className="num block text-sm text-muted">
                          Budget used {Math.round((p.cost / Math.max(p.contractValue, 1)) * 100)}% · completion {p.completion}%
                        </span>
                      </span>
                      <Badge tone={p.health === "DELAYED" ? "danger" : "warning"}>{p.risk ?? humanize(p.health)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Cash flow" subtitle={data?.period.label ?? "This month"} />
          <div className="grid grid-cols-3 divide-x divide-hairline border-b border-hairline">
            {[
              ["Cash in", data?.cashflow.in ?? 0, "text-success"],
              ["Cash out", data?.cashflow.out ?? 0, "text-danger"],
              ["Net", data?.cashflow.net ?? 0, (data?.cashflow.net ?? 0) >= 0 ? "text-fg" : "text-danger"]
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="px-3 py-3">
                <p className="label-micro">{label}</p>
                <p className={`num mt-1 text-base font-semibold ${tone}`}>{formatMoneyCompact(value as number, currency)}</p>
              </div>
            ))}
          </div>
          <div className="p-2">
            {loading || !data ? <Skeleton className="h-[132px]" /> : <CashflowChart data={data.cashflow.series} currency={currency} />}
          </div>
        </Card>
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Project profitability"
            subtitle="Contract value against recorded cost"
            action={<ButtonLink size="sm" href={path("/projects")}>All projects</ButtonLink>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  {["Project", "Contract", "Cost", "Profit", "Margin", "Status"].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${i > 0 && i < 5 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profitable.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-sunken/70">
                    <td className="px-4 py-2.5">
                      <Link href={path(`/projects/${p.id}`)} className="block max-w-[220px] truncate text-sm font-medium hover:text-accent">
                        {p.name}
                      </Link>
                      <span className="num text-xs text-subtle">{p.id}</span>
                    </td>
                    <td className="num px-4 py-2.5 text-right text-sm">{formatMoneyCompact(p.contractValue, currency)}</td>
                    <td className="num px-4 py-2.5 text-right text-sm">{formatMoneyCompact(p.cost, currency)}</td>
                    <td className="num px-4 py-2.5 text-right text-sm font-medium">{formatMoneyCompact(p.profit, currency)}</td>
                    <td className={`num px-4 py-2.5 text-right text-sm ${p.margin < 12 ? "text-warning" : ""}`}>{formatPercent(p.margin)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-laterite-500" /> BuildFlow AI insights</span>}
            subtitle="Computed from your records  nothing is changed automatically"
          />
          <ul className="divide-y divide-hairline">
            {insights.map((insight) => (
              <li key={insight.id} className="px-4 py-3">
                <p className="flex gap-2 text-base font-medium leading-snug">
                  <InsightIcon tone={insight.tone} />
                  <span>{insight.title}</span>
                </p>
                <p className="mt-1 pl-6 text-sm leading-relaxed text-muted">{insight.detail}</p>
                <div className="mt-2 pl-6">
                  <ButtonLink size="sm" href={path(insight.href)}>{insight.action} <ArrowRight className="h-3.5 w-3.5" /></ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Outstanding invoices"
            subtitle="Sorted by due date"
            action={<ButtonLink size="sm" href={path("/invoices?status=OVERDUE,PARTIALLY_PAID,SENT")}>View all</ButtonLink>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  {["Invoice", "Client", "Project", "Due", "Amount", "Outstanding", "Status"].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-hairline last:border-0 hover:bg-sunken/70">
                    <td className="num px-4 py-2.5 text-sm">
                      <Link href={path(`/invoices/${invoice.id}`)} className="font-medium hover:text-accent">{invoice.id}</Link>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2.5 text-sm">{invoice.clientName}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-sm text-muted">{invoice.projectName}</td>
                    <td className="px-4 py-2.5 text-sm">{dueLabel(invoice.dueDate)}</td>
                    <td className="num px-4 py-2.5 text-right text-sm">{formatMoney(invoice.total, currency, 0)}</td>
                    <td className="num px-4 py-2.5 text-right text-sm font-medium">{formatMoney(invoice.total - invoice.paid, currency, 0)}</td>
                    <td className="px-4 py-2.5 text-right"><StatusBadge status={invoice.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent estimates" action={<ButtonLink size="sm" href={path("/estimates")}>All</ButtonLink>} />
          <ul className="divide-y divide-hairline">
            {estimates.map((estimate) => (
              <li key={estimate.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={path(`/estimates/${estimate.id}`)} className="num block text-sm font-medium hover:text-accent">{estimate.id}</Link>
                    <p className="truncate text-sm text-muted">{estimate.title}</p>
                  </div>
                  <StatusBadge status={estimate.status} />
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <ButtonLink size="sm" href={path(`/estimates/${estimate.id}`)}>Edit</ButtonLink>
                  <ButtonLink size="sm" href={path(`/estimates/${estimate.id}?action=duplicate`)}>Duplicate</ButtonLink>
                  <ButtonLink size="sm" variant="primary" href={path(`/estimates/${estimate.id}?action=quote`)}>Quote</ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-3">
        <RecentActivity />
      </section>
    </>
  );
}

/** The estimate last touched, so a contractor can pick up where they left off. */
function ContinueWork({ path, estimates, currency }: { path: (p: string) => string; estimates: Estimate[]; currency: string }) {
  const current = estimates[0];
  if (!current) {
    return (
      <Link href={path("/estimates/new")} className="mb-3 flex items-center gap-3 rounded-lg border border-dashed border-hairline bg-surface px-4 py-3 transition hover:bg-sunken">
        <span className="h-2 w-2 rounded-full bg-info" />
        <span className="label-micro text-info">Start here</span>
        <span className="font-semibold">Build your first estimate</span>
        <span className="hidden text-sm text-muted md:inline">· price a job from your rate library</span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted" />
      </Link>
    );
  }

  return (
    <Link href={path(`/estimates/${current.id}`)} className="mb-3 flex items-center gap-3 rounded-lg border border-hairline bg-surface px-4 py-3 transition hover:bg-sunken">
      <span className="h-2 w-2 rounded-full bg-info" />
      <span className="label-micro text-info">Continue your work</span>
      <span className="font-semibold">{current.title}</span>
      {current.projectName ? <span className="hidden text-sm text-muted md:inline">· {current.projectName}</span> : null}
      <span className="ml-auto hidden text-sm font-medium md:inline">
        {current.positions} {current.positions === 1 ? "position" : "positions"}
      </span>
      <span className="num text-sm font-semibold">{formatMoney(current.total, currency, 0)}</span>
      <ArrowRight className="h-4 w-4 text-muted" />
    </Link>
  );
}

function PortfolioStrip({ data, loading, currency, projectCount, estimateCount, estimates }: {
  data: ReturnType<typeof useSummary>["data"]; loading: boolean; currency: string;
  projectCount: number; estimateCount: number; estimates: Estimate[];
}) {
  // How much of the work on the board actually carries a rate. A line priced at zero is a hole in
  // the estimate, so this counts them rather than assuming everything is priced.
  const positions = estimates.reduce((sum, estimate) => sum + estimate.positions, 0);
  const priced = estimates.reduce((sum, estimate) => sum + estimate.pricedPositions, 0);

  const items = [
    ["Total value", formatMoneyCompact((data?.kpis.revenue.value ?? 0) + (data?.kpis.outstanding.value ?? 0), currency), "multi-currency", "text-info", Database],
    ["Active estimates", String(estimateCount), "estimates", "text-laterite-600", FileText],
    ["Project status", String(data?.kpis.activeProjects.value ?? projectCount), "active", "text-info", CalendarDays],
    [
      "Priced positions",
      loading ? "…" : positions ? formatPercent((priced / positions) * 100) : "—",
      positions ? `${priced} of ${positions} priced` : "no positions yet",
      "text-success",
      CheckCircle2
    ]
  ] as const;
  return (
    <section className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, detail, tone, Icon]) => (
        <Card key={label} className="px-4 py-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sunken ${tone}`}><Icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="num text-xl font-semibold">{value}</p>
              <p className="mt-1 text-sm text-muted">{label} · {detail}</p>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}

function FinanceSummary({ currency, path, invoices }: { currency: string; path: (p: string) => string; invoices: Invoice[] }) {
  const open = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.total - invoice.paid), 0);
  const warningCount = invoices.filter((invoice) => invoice.status === "OVERDUE").length;
  return (
    <Card>
      <CardHeader title="Finance summary" action={<ButtonLink size="sm" variant="ghost" href={path("/invoices")}>Open Finance <ArrowRight className="h-3.5 w-3.5" /></ButtonLink>} />
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <p className="label-micro text-laterite-600">Awaiting payment</p>
          <p className="num mt-2 text-xl font-semibold">{formatMoney(open, currency, 0)}</p>
          <p className="mt-1 text-xs text-muted">
            {invoices.length ? `${invoices.length} open ${invoices.length === 1 ? "invoice" : "invoices"}` : "nothing outstanding"}
          </p>
        </div>
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <p className="label-micro">Overdue</p>
          <p className="num mt-2 text-2xl font-semibold">{warningCount}</p>
          <p className="mt-1 text-xs text-muted">
            {warningCount ? "past the agreed due date" : "nothing past its due date"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function InboxAndUpload({ path }: { path: (p: string) => string }) {
  const { rows: notifications, loading, error, refresh } = useList<Notification>("notifications", { size: 4 });
  const unread = notifications.filter((notification) => !notification.read);

  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-info" /> Inbox
              {unread.length ? <Badge tone="info">{unread.length}</Badge> : null}
            </span>
          }
          action={<ButtonLink size="sm" variant="ghost" href={path("/activity")}>View all</ButtonLink>}
        />
        {loading ? (
          <div className="p-4"><SkeletonText lines={3} /></div>
        ) : error ? (
          <div className="flex min-h-[118px] flex-col items-center justify-center p-6 text-center">
            <CircleAlert className="h-5 w-5 text-danger" />
            <p className="mt-2 text-sm text-muted">{error.message}</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={refresh}>Retry</Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[118px] flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-muted">Nothing needs you right now.</p>
            <p className="mt-1 text-xs text-subtle">Quote views, payments and approvals arrive here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link href={path(notification.href || "/activity")} className="block px-4 py-2.5 transition-colors hover:bg-sunken">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {!notification.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-info" /> : null}
                    <span className="truncate">{notification.title}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">{notification.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="border-dashed">
        <div className="flex min-h-[168px] items-center justify-center p-6">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 text-info"><Upload className="h-5 w-5" /></span>
            <p className="mt-3 font-semibold">Drop files here</p>
            <p className="mt-1 text-sm text-muted">Create a project first, then upload files here.</p>
            <div className="mt-2 flex items-center justify-center gap-3 text-xs">
              <Link href={path("/projects?new=1")} className="text-info hover:underline">Create a project</Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RecentProjectsGrid({ path, projects, currency }: { path: (p: string) => string; projects: Project[]; currency: string }) {
  const visible = projects.slice(0, 4);
  if (!visible.length) return null;
  return (
    <section className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Layers className="h-4 w-4 text-muted" /> Projects <Badge tone="info">{projects.length}</Badge></h2>
        <ButtonLink size="sm" variant="ghost" href={path("/projects")}>View all <ArrowRight className="h-3.5 w-3.5" /></ButtonLink>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((project) => (
          <Link key={project.id} href={path(`/projects/${project.id}`)} className="rounded-lg border border-hairline bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-sm font-semibold text-info">{project.name[0]}</span>
            <h3 className="mt-3 line-clamp-1 font-semibold">{project.name}</h3>
            <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{project.type} · {project.city}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="info">{project.region}</Badge>
              <Badge>{currency}</Badge>
              <StatusBadge status={project.health} />
            </div>
            <div className="mt-3 rounded-lg border border-hairline p-3">
              <p className="label-micro">Total value</p>
              <p className="num mt-1 text-lg font-semibold">{formatMoneyCompact(project.contractValue, currency)}</p>
            </div>
            <p className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{project.completion}% complete · 1 BOQ</span>
              <ArrowRight className="h-4 w-4" />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Setup progress read from what the company has actually done, so a step only reads as complete
 * once the record behind it exists.
 */
function GettingStarted({ path, projects, estimates, team }: {
  path: (p: string) => string; projects: number; estimates: number; team: number;
}) {
  const done = { "Create Project": projects > 0, "Build Your BOQ": estimates > 0, "Invite Your Team": team > 1 };
  const complete = Object.values(done).filter(Boolean).length;

  if (complete === GETTING_STARTED.length) {
    return null;
  }

  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-info" />
        <h2 className="text-base font-semibold">Getting Started</h2>
        <span className="num text-sm text-info">{complete}/{GETTING_STARTED.length}</span>
      </div>
      <Progress value={(complete / GETTING_STARTED.length) * 100} className="mb-4" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {GETTING_STARTED.map((item, index) => {
          const Icon = item.icon;
          const complete = done[item.title as keyof typeof done] ?? false;
          return (
            <Card key={item.title} className={`p-4 ${complete ? "border-success/30" : "border-info/25"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${complete ? "bg-success/10 text-success" : "bg-info/10 text-info"}`}>{index + 1}</span>
                {complete ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
              </div>
              <Icon className="mt-4 h-5 w-5 text-muted" />
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 min-h-10 text-sm text-muted">{item.detail}</p>
              <ButtonLink className="mt-4 w-full" size="sm" href={path(item.href)} variant={complete ? "secondary" : "primary"}>
                {complete ? "Done" : item.status} <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function SuggestedNextSteps({ path }: { path: (p: string) => string }) {
  return (
    <section className="mt-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-warning" /> Suggested Next Steps</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        {NEXT_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link key={step.title} href={path(step.href)} className="rounded-lg border border-hairline bg-surface p-4 transition hover:bg-sunken">
              <Icon className="h-5 w-5 text-laterite-600" />
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.detail}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Kpi({ label, value, foot, href, loading }: { label: string; value: string; foot?: React.ReactNode; href: string; loading?: boolean }) {
  return (
    <Link href={href} className="group rounded-lg border border-hairline bg-surface px-4 py-3 transition-colors hover:border-strongline hover:bg-sunken/50">
      <span className="flex items-center justify-between">
        <span className="label-micro">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      {loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="num mt-1 text-3xl font-semibold">{value}</p>}
      <span className="mt-1 flex items-center gap-1 text-xs">{foot}</span>
    </Link>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function InsightIcon({ tone }: { tone: Insight["tone"] }) {
  if (tone === "danger") return <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />;
  if (tone === "warning") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />;
  if (tone === "positive") return <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-success" />;
  return <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-laterite-500" />;
}

const CHANNELS = [
  { value: "", label: "All" },
  { value: "PROJECTS", label: "Projects" },
  { value: "FINANCE", label: "Finance" },
  { value: "SALES", label: "Sales" },
  { value: "TEAM", label: "Team" }
];

function RecentActivity() {
  const { tenant } = useTenantContext();
  const [channel, setChannel] = useState("");
  const { rows, loading } = useList<Activity>("activity", { channel, size: 10 });

  return (
    <Card>
      <CardHeader
        title="Recent activity"
        action={<SegmentedControl size="sm" value={channel} onChange={setChannel} options={CHANNELS} />}
      />
      <ul className="divide-y divide-hairline">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 py-3"><Skeleton className="h-3 w-2/3" /></li>
            ))
          : rows.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-2xs font-semibold text-muted">
                  {item.actor.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm">
                  {item.href ? (
                    <Link href={tenantPath(tenant.slug, item.href)} className="hover:text-accent">{item.text}</Link>
                  ) : item.text}
                </p>
                <span className="shrink-0 text-xs text-subtle">{formatRelative(item.at)}</span>
              </li>
            ))}
      </ul>
      <div className="border-t border-hairline px-4 py-2">
        <Button size="sm" variant="ghost" className="w-full" onClick={() => { window.location.href = tenantPath(tenant.slug, "/activity"); }}>
          View full activity log
        </Button>
      </div>
    </Card>
  );
}
