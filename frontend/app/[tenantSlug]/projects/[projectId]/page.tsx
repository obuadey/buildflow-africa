"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calculator, CreditCard, FileText, Plus, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Tabs, MiniTable } from "../../../../components/ui/Tabs";
import { StatusBadge } from "../../../../components/ui/Badge";
import { Button, ButtonLink } from "../../../../components/ui/Button";
import { Progress } from "../../../../components/ui/Misc";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { ErrorState } from "../../../../components/ui/EmptyState";
import { useRecord } from "../../../../lib/client";
import { formatDate, formatMoney, formatPercent, formatRelative, dueLabel } from "../../../../lib/format";
import { tenantPath } from "../../../../lib/tenant";
import type {
  Activity, Contract, Estimate, Expense, Invoice, Payment, Project, Quotation, Variation, Client
} from "../../../../lib/types";

type Detail = Project & {
  client: Client | null;
  estimates: Estimate[];
  quotations: Quotation[];
  contracts: Contract[];
  variations: Variation[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  activity: Activity[];
};

type TabKey = "overview" | "estimate" | "quotes" | "contract" | "variations" | "invoices" | "payments" | "expenses" | "activity";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { tenant } = useTenantContext();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const { data, loading, error, refresh } = useRecord<Detail>("projects", projectId);
  const [tab, setTab] = useState<TabKey>("overview");
  const currency = tenant.currency;

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonText lines={6} />
      </Card>
    );
  }
  if (error || !data) {
    return <Card><ErrorState title="We couldn't load this project." message={error?.message} onRetry={refresh} /></Card>;
  }

  const paid = data.invoices.reduce((s, i) => s + i.paid, 0);
  const received = data.payments.reduce((s, p) => s + p.amount, 0);
  const invoiced = data.invoices.reduce((s, i) => s + i.total, 0);
  const actualCost = data.expenses.reduce((s, e) => s + e.amount, 0);
  const approvedVariations = data.variations.filter((v) => v.status === "APPROVED").reduce((s, v) => s + v.amount, 0);
  const contractValue = data.contractValue + approvedVariations;
  const forecastProfit = contractValue - Math.max(actualCost, data.cost);

  return (
    <>
      <PageHeader
        title={data.name}
        meta={<><StatusBadge status={data.status} /><StatusBadge status={data.health} /></>}
        description={
          <>
            <span className="num">{data.id}</span> · {data.clientName} · {data.city}, {data.region} · Managed by {data.manager}
          </>
        }
        actions={
          <>
            <ButtonLink href={path(`/estimates/new?project=${data.id}`)}><Calculator className="h-4 w-4" /> New estimate</ButtonLink>
            <ButtonLink href={path(`/invoices?new=1&project=${data.id}`)}><FileText className="h-4 w-4" /> New invoice</ButtonLink>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Contract value", formatMoney(contractValue, currency, 0), approvedVariations ? `incl. ${formatMoney(approvedVariations, currency, 0)} variations` : "no approved variations"],
          ["Actual cost", formatMoney(actualCost, currency, 0), `${data.expenses.length} expense records`],
          ["Invoiced", formatMoney(invoiced, currency, 0), `${data.invoices.length} invoices`],
          ["Paid", formatMoney(received || paid, currency, 0), `${formatMoney(invoiced - paid, currency, 0)} outstanding`],
          ["Profit forecast", formatMoney(forecastProfit, currency, 0), `${formatPercent(contractValue ? (forecastProfit / contractValue) * 100 : 0)} margin`]
        ].map(([label, value, foot]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            <p className="num mt-1 text-3xl font-semibold">{value}</p>
            <p className="num mt-0.5 text-xs text-muted">{foot}</p>
          </Card>
        ))}
      </section>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "estimate", label: "Estimates", count: data.estimates.length },
            { value: "quotes", label: "Quotes", count: data.quotations.length },
            { value: "contract", label: "Contract", count: data.contracts.length },
            { value: "variations", label: "Variations", count: data.variations.length },
            { value: "invoices", label: "Invoices", count: data.invoices.length },
            { value: "payments", label: "Payments", count: data.payments.length },
            { value: "expenses", label: "Expenses", count: data.expenses.length },
            { value: "activity", label: "Activity" }
          ]}
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {tab === "overview" ? (
            <Card>
              <CardHeader title="Delivery" subtitle={`${formatDate(data.startDate)} → ${formatDate(data.endDate)}`} />
              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted">Reported completion</span>
                    <span className="num font-medium">{data.completion}%</span>
                  </div>
                  <Progress value={data.completion} tone={data.health === "DELAYED" ? "danger" : data.health === "AT_RISK" ? "warning" : "brand"} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted">Budget consumed</span>
                    <span className="num font-medium">{formatPercent(contractValue ? (Math.max(actualCost, data.cost) / contractValue) * 100 : 0)}</span>
                  </div>
                  <Progress value={contractValue ? (Math.max(actualCost, data.cost) / contractValue) * 100 : 0} tone="neutral" />
                </div>
                {data.risk ? (
                  <p className="rounded border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                    Flagged risk: {data.risk}. Cost is running ahead of reported progress.
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          {tab === "estimate" ? (
            <Card>
              <CardHeader title="Estimates" action={<ButtonLink size="sm" variant="primary" href={path(`/estimates/new?project=${data.id}`)}><Plus className="h-3.5 w-3.5" /> New</ButtonLink>} />
              <MiniTable
                head={["Estimate", "Status", "Estimator", "Updated"]}
                rows={data.estimates.map((e) => [
                  <Link key={e.id} href={path(`/estimates/${e.id}`)} className="num font-medium hover:text-accent">{e.reference}</Link>,
                  <StatusBadge key="s" status={e.status} />,
                  e.estimator,
                  formatRelative(e.updatedAt)
                ])}
                empty="No estimates on this project yet."
              />
            </Card>
          ) : null}

          {tab === "quotes" ? (
            <Card>
              <CardHeader title="Quotations" />
              <MiniTable
                head={["Quote", "Status", "Amount", "Expiry"]}
                rows={data.quotations.map((q) => [
                  <Link key={q.id} href={path(`/quotations/${q.id}`)} className="num font-medium hover:text-accent">{q.id}</Link>,
                  <StatusBadge key="s" status={q.status} />,
                  formatMoney(q.amount, currency, 0),
                  formatDate(q.expiry)
                ])}
                empty="No quotations issued for this project."
              />
            </Card>
          ) : null}

          {tab === "contract" ? (
            <Card>
              <CardHeader title="Contract & payment schedule" />
              {data.contracts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">No contract yet. Accept a quotation to create one.</p>
              ) : (
                data.contracts.map((contract) => (
                  <div key={contract.id} className="border-b border-hairline last:border-0">
                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                      {[
                        ["Original", formatMoney(contract.original, currency, 0)],
                        ["Variations", formatMoney(contract.variations, currency, 0)],
                        ["Revised value", formatMoney(contract.value, currency, 0)],
                        ["Retention", formatPercent(contract.retentionPct)]
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p className="label-micro">{l}</p>
                          <p className="num mt-0.5 text-base font-semibold">{v}</p>
                        </div>
                      ))}
                    </div>
                    <MiniTable
                      head={["Milestone", "Percent", "Amount", "Status"]}
                      rows={contract.milestones.map((m) => [m.name, formatPercent(m.percent, 0), formatMoney(m.amount, currency, 0), <StatusBadge key="s" status={m.status} />])}
                    />
                  </div>
                ))
              )}
            </Card>
          ) : null}

          {tab === "variations" ? (
            <Card>
              <CardHeader title="Variation orders" action={<ButtonLink size="sm" variant="primary" href={path(`/variations?new=1&project=${data.id}`)}><Plus className="h-3.5 w-3.5" /> New</ButtonLink>} />
              <MiniTable
                head={["Variation", "Title", "Amount", "Status"]}
                rows={data.variations.map((v) => [
                  <span key="i" className="num font-medium">{v.reference}</span>,
                  v.title,
                  formatMoney(v.amount, currency, 0),
                  <StatusBadge key="s" status={v.status} />
                ])}
                empty="No variations raised."
              />
            </Card>
          ) : null}

          {tab === "invoices" ? (
            <Card>
              <CardHeader title="Invoices" action={<ButtonLink size="sm" variant="primary" href={path(`/invoices?new=1&project=${data.id}`)}><Receipt className="h-3.5 w-3.5" /> New</ButtonLink>} />
              <MiniTable
                head={["Invoice", "Due", "Total", "Outstanding", "Status"]}
                rows={data.invoices.map((i) => [
                  <Link key={i.id} href={path(`/invoices/${i.id}`)} className="num font-medium hover:text-accent">{i.reference}</Link>,
                  dueLabel(i.dueDate),
                  formatMoney(i.total, currency, 0),
                  formatMoney(i.total - i.paid, currency, 0),
                  <StatusBadge key="s" status={i.status} />
                ])}
                empty="No invoices raised on this project."
              />
            </Card>
          ) : null}

          {tab === "payments" ? (
            <Card>
              <CardHeader title="Payments" action={<ButtonLink size="sm" variant="primary" href={path(`/payments?new=1&project=${data.id}`)}><Wallet className="h-3.5 w-3.5" /> Record</ButtonLink>} />
              <MiniTable
                head={["Payment", "Invoice", "Date", "Method", "Amount"]}
                rows={data.payments.map((p) => [
                  <span key="p" className="num font-medium">{p.reference}</span>,
                  <Link key="i" href={path(`/invoices/${p.invoiceId}`)} className="num hover:text-accent">{p.invoiceNumber ?? "—"}</Link>,
                  formatDate(p.date),
                  p.method.toLowerCase().replace("_", " "),
                  formatMoney(p.amount, currency, 0)
                ])}
                empty="No payments recorded against this project's invoices."
              />
            </Card>
          ) : null}

          {tab === "expenses" ? (
            <Card>
              <CardHeader title="Project expenses" action={<ButtonLink size="sm" variant="primary" href={path(`/expenses?new=1&project=${data.id}`)}><CreditCard className="h-3.5 w-3.5" /> Record</ButtonLink>} />
              <MiniTable
                head={["Date", "Vendor", "Category", "Amount", "Receipt"]}
                rows={data.expenses.slice(0, 25).map((e) => [
                  formatDate(e.date),
                  e.vendor,
                  e.category.toLowerCase(),
                  formatMoney(e.amount, currency, 0),
                  e.receipt ? "Attached" : "Missing"
                ])}
                empty="No expenses recorded."
              />
            </Card>
          ) : null}

          {tab === "activity" ? (
            <Card>
              <CardHeader title="Activity" />
              <ul className="divide-y divide-hairline">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{a.text}</span>
                    <span className="shrink-0 text-xs text-subtle">{formatRelative(a.at)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Client" action={data.client ? <ButtonLink size="sm" href={path(`/clients/${data.client.id}`)}>Open</ButtonLink> : undefined} />
            <dl className="divide-y divide-hairline">
              {[
                ["Name", data.clientName],
                ["Phone", data.client?.phone ?? ""],
                ["Email", data.client?.email ?? ""],
                ["Location", data.client ? `${data.client.city}, ${data.client.region}` : ""],
                ["Outstanding", formatMoney(data.client?.outstanding ?? 0, currency, 0)]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <dt className="text-muted">{label}</dt>
                  <dd className="num max-w-[60%] truncate text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Project details" />
            <dl className="divide-y divide-hairline">
              {[
                ["Number", data.reference],
                ["Type", data.type],
                ["Location", `${data.city}, ${data.region}`],
                ["Start", formatDate(data.startDate)],
                ["Expected completion", formatDate(data.endDate)],
                ["Manager", data.manager]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <dt className="text-muted">{label}</dt>
                  <dd className="num text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
