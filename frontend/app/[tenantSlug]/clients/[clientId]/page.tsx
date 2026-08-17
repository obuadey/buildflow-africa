"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { MiniTable, Tabs } from "../../../../components/ui/Tabs";
import { Badge, StatusBadge } from "../../../../components/ui/Badge";
import { ButtonLink } from "../../../../components/ui/Button";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { ErrorState } from "../../../../components/ui/EmptyState";
import { useRecord } from "../../../../lib/client";
import { dueLabel, formatDate, formatMoney } from "../../../../lib/format";
import { tenantPath } from "../../../../lib/tenant";
import type { Client, Estimate, Invoice, Project, Quotation } from "../../../../lib/types";

type Detail = Client & { projectList: Project[]; estimates: Estimate[]; quotations: Quotation[]; invoices: Invoice[] };

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { tenant } = useTenantContext();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const { data, loading, error, refresh } = useRecord<Detail>("clients", clientId);
  const [tab, setTab] = useState<"projects" | "estimates" | "quotations" | "invoices">("projects");
  const currency = tenant.currency;

  if (loading) return <Card className="p-6"><SkeletonText lines={6} /></Card>;
  if (error || !data) return <Card><ErrorState title="We couldn't load this client." message={error?.message} onRetry={refresh} /></Card>;

  const invoiced = data.invoices.reduce((s, i) => s + i.total, 0);
  const paid = data.invoices.reduce((s, i) => s + i.paid, 0);

  return (
    <>
      <PageHeader
        title={data.name}
        meta={<Badge tone={data.type === "COMPANY" ? "info" : "neutral"}>{data.type === "COMPANY" ? "Company" : "Individual"}</Badge>}
        description={<>{data.company ? <>{data.company} · </> : null}{[data.city, data.region].filter(Boolean).join(", ")} · client since {formatDate(data.createdAt)}</>}
        actions={
          <>
            <a href={`tel:${data.phone}`} className="inline-flex h-9 items-center gap-2 rounded border border-hairline bg-surface px-3 text-base font-medium hover:bg-sunken"><Phone className="h-4 w-4" /> Call</a>
            <a href={`https://wa.me/${data.whatsapp?.replace(/\D/g, "") ?? ""}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded border border-hairline bg-surface px-3 text-base font-medium hover:bg-sunken"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <a href={`mailto:${data.email}`} className="inline-flex h-9 items-center gap-2 rounded border border-transparent bg-accent px-3 text-base font-medium text-accent-fg hover:bg-brand-700"><Mail className="h-4 w-4" /> Email</a>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Lifetime revenue", formatMoney(data.revenue, currency, 0)],
          ["Invoiced", formatMoney(invoiced, currency, 0)],
          ["Paid", formatMoney(paid, currency, 0)],
          ["Outstanding", formatMoney(invoiced - paid, currency, 0)]
        ].map(([label, value]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            <p className="num mt-1 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "projects", label: "Projects", count: data.projectList.length },
              { value: "estimates", label: "Estimates", count: data.estimates.length },
              { value: "quotations", label: "Quotations", count: data.quotations.length },
              { value: "invoices", label: "Invoices", count: data.invoices.length }
            ]}
          />
          <Card className="mt-3">
            {tab === "projects" ? (
              <MiniTable
                head={["Project", "Contract", "Completion", "Status"]}
                rows={data.projectList.map((p) => [
                  <Link key={p.id} href={path(`/projects/${p.id}`)} className="font-medium hover:text-accent">{p.name}</Link>,
                  formatMoney(p.contractValue, currency, 0),
                  `${p.completion}%`,
                  <StatusBadge key="s" status={p.status} />
                ])}
                empty="No projects for this client yet."
              />
            ) : null}
            {tab === "estimates" ? (
              <MiniTable
                head={["Estimate", "Project", "Status", "Updated"]}
                rows={data.estimates.map((e) => [
                  <Link key={e.id} href={path(`/estimates/${e.id}`)} className="num font-medium hover:text-accent">{e.reference}</Link>,
                  e.projectName,
                  <StatusBadge key="s" status={e.status} />,
                  formatDate(e.updatedAt)
                ])}
                empty="No estimates prepared for this client."
              />
            ) : null}
            {tab === "quotations" ? (
              <MiniTable
                head={["Quote", "Amount", "Status", "Expiry"]}
                rows={data.quotations.map((q) => [
                  <Link key={q.id} href={path(`/quotations/${q.id}`)} className="num font-medium hover:text-accent">{q.reference}</Link>,
                  formatMoney(q.amount, currency, 0),
                  <StatusBadge key="s" status={q.status} />,
                  formatDate(q.expiry)
                ])}
                empty="No quotations issued to this client."
              />
            ) : null}
            {tab === "invoices" ? (
              <MiniTable
                head={["Invoice", "Due", "Total", "Outstanding", "Status"]}
                rows={data.invoices.map((i) => [
                  <Link key={i.id} href={path(`/invoices/${i.id}`)} className="num font-medium hover:text-accent">{i.reference}</Link>,
                  dueLabel(i.dueDate),
                  formatMoney(i.total, currency, 0),
                  formatMoney(i.total - i.paid, currency, 0),
                  <StatusBadge key="s" status={i.status} />
                ])}
                empty="No invoices for this client."
              />
            ) : null}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Contact details" />
          <dl className="divide-y divide-hairline">
            {[
              ["Phone", data.phone],
              ["WhatsApp", data.whatsapp ?? ""],
              ["Email", data.email],
              ["Region", data.region],
              ["City", data.city],
              ["Notes", data.notes ?? ""]
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
                <dt className="shrink-0 text-muted">{label}</dt>
                <dd className="num max-w-[62%] break-words text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
