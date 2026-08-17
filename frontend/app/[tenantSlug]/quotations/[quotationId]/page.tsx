"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Copy, Download, FileSignature, Link2, Send, X } from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button, ButtonLink } from "../../../../components/ui/Button";
import { StatusBadge } from "../../../../components/ui/Badge";
import { MiniTable, Tabs } from "../../../../components/ui/Tabs";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { ErrorState } from "../../../../components/ui/EmptyState";
import { createRecord, patchRecord, useRecord } from "../../../../lib/client";
import { adjustedQuantity, lineTotal, type EstimateTotals } from "../../../../lib/calc";
import { formatDate, formatMoney, formatNumber, formatPercent, formatRelative } from "../../../../lib/format";
import { tenantPath } from "../../../../lib/tenant";
import type { Contract, Estimate, Project, Quotation } from "../../../../lib/types";

type Detail = Quotation & { estimate: Estimate | null; totals: EstimateTotals | null; project: Project | null; contract: Contract | null };

export default function QuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const { tenant } = useTenantContext();
  const router = useRouter();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const { data, loading, error, refresh } = useRecord<Detail>("quotations", quotationId);
  const [tab, setTab] = useState<"preview" | "activity" | "versions" | "financials">("preview");
  const [copied, setCopied] = useState(false);
  const currency = tenant.currency;

  if (loading) return <Card className="p-6"><SkeletonText lines={8} /></Card>;
  if (error || !data) return <Card><ErrorState title="We couldn't load this quotation." message={error?.message} onRetry={refresh} /></Card>;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${data.token}` : `/q/${data.token}`;

  async function setStatus(status: Quotation["status"]) {
    await patchRecord(tenant.slug, "quotations", data!.id, { status, sentAt: status === "SENT" ? new Date().toISOString() : data!.sentAt });
    refresh();
  }

  async function createContract() {
    const contract = await createRecord<{ id: string }>(tenant.slug, "contracts", {
      projectId: data!.projectId,
      quotationId: data!.id,
      original: data!.amount,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    });
    router.push(path(`/contracts?selected=${contract.id}`));
  }

  return (
    <>
      <PageHeader
        title={`Quotation ${data.reference}`}
        meta={<><StatusBadge status={data.status} /><span className="num text-sm text-muted">version {data.version}</span></>}
        description={<>{data.clientName} · {data.projectName} · valid until {formatDate(data.expiry)}</>}
        actions={
          <>
            {data.estimate ? <ButtonLink href={path(`/estimates/${data.estimate.id}`)}>Edit estimate</ButtonLink> : null}
            <Button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {copied ? "Link copied" : "Share link"}
            </Button>
            <Button onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
            {data.status === "DRAFT" ? (
              <Button variant="primary" onClick={() => setStatus("SENT")}><Send className="h-4 w-4" /> Send to client</Button>
            ) : data.status === "ACCEPTED" && !data.contract ? (
              <Button variant="primary" onClick={createContract}><FileSignature className="h-4 w-4" /> Convert to contract</Button>
            ) : (
              <Button variant="primary" onClick={() => setStatus("DRAFT")}><Copy className="h-4 w-4" /> Create revision</Button>
            )}
            {["SENT", "VIEWED", "NEGOTIATING"].includes(data.status) ? (
              <>
                <Button onClick={() => setStatus("ACCEPTED")}><Check className="h-4 w-4" /> Accept</Button>
                <Button variant="danger" onClick={() => setStatus("REJECTED")}><X className="h-4 w-4" /> Reject</Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "preview", label: "Document" },
              { value: "financials", label: "Financials" },
              { value: "activity", label: "Client activity" },
              { value: "versions", label: "Versions", count: data.version }
            ]}
          />

          {tab === "preview" ? (
            <Card className="mt-3 p-6">
              <div className="flex items-start justify-between gap-6 border-b border-hairline pb-5">
                <div>
                  <p className="text-lg font-semibold tracking-tight">{tenant.name}</p>
                  <p className="mt-0.5 text-sm text-muted">{tenant.city}, {tenant.region}</p>
                  {tenant.tin ? <p className="num text-sm text-muted">TIN {tenant.tin}</p> : null}
                </div>
                <div className="text-right">
                  <p className="label-micro">Quotation</p>
                  <p className="num text-lg font-semibold">{data.reference}</p>
                  <p className="num text-sm text-muted">Issued {formatDate(data.sentAt ?? data.createdAt)}</p>
                  <p className="num text-sm text-muted">Valid until {formatDate(data.expiry)}</p>
                </div>
              </div>

              <div className="grid gap-6 border-b border-hairline py-5 sm:grid-cols-2">
                <div>
                  <p className="label-micro">Prepared for</p>
                  <p className="mt-1 text-base font-medium">{data.clientName}</p>
                  <Link href={path(`/clients/${data.clientId}`)} className="num text-sm text-muted hover:text-accent">{data.clientId}</Link>
                </div>
                <div>
                  <p className="label-micro">Project</p>
                  <p className="mt-1 text-base font-medium">{data.projectName}</p>
                  {data.project ? <p className="text-sm text-muted">{data.project.city}, {data.project.region}</p> : null}
                </div>
              </div>

              {(data.estimate?.sections ?? []).map((section) => (
                <div key={section.id} className="py-4">
                  <p className="label-micro mb-1.5">{section.name}</p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-hairline">
                        {["Description", "Qty", "Unit", "Rate", "Amount"].map((h, i) => (
                          <th key={h} className={`px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item) => (
                        <tr key={item.id} className="border-b border-hairline last:border-0">
                          <td className="px-2 py-1.5 text-sm">{item.description}</td>
                          <td className="num px-2 py-1.5 text-right text-sm">{formatNumber(adjustedQuantity(item))}</td>
                          <td className="num px-2 py-1.5 text-right text-sm">{item.unit}</td>
                          <td className="num px-2 py-1.5 text-right text-sm">{formatMoney(item.rate * (1 + item.markup / 100), currency)}</td>
                          <td className="num px-2 py-1.5 text-right text-sm font-medium">{formatMoney(lineTotal(item), currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <dl className="ml-auto w-72 space-y-1 border-t border-hairline pt-4 text-sm">
                <Row label="Subtotal" value={formatMoney(data.totals?.subtotal, currency)} />
                {data.totals?.discount ? <Row label="Discount" value={`− ${formatMoney(data.totals.discount, currency)}`} /> : null}
                <Row label="Tax" value={formatMoney(data.totals?.tax, currency)} />
                <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="num">{formatMoney(data.amount, currency)}</dd>
                </div>
              </dl>

              <div className="mt-6 grid gap-4 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="label-micro mb-1">Terms</p>
                  <p className="text-muted">50% mobilisation, 30% at superstructure, 20% on completion. Prices hold for 30 days from issue.</p>
                </div>
                <div>
                  <p className="label-micro mb-1">Exclusions</p>
                  <p className="text-muted">Statutory permits, utility connection fees, furniture and loose fittings, works outside the described scope.</p>
                </div>
              </div>
            </Card>
          ) : null}

          {tab === "financials" ? (
            <Card className="mt-3">
              <CardHeader title="Financial summary" subtitle="Internal only  never shown on client documents" />
              <MiniTable
                head={["Line", "Amount"]}
                rows={[
                  ["Materials", formatMoney(data.totals?.materialsCost, currency)],
                  ["Labour", formatMoney(data.totals?.labourCost, currency)],
                  ["Equipment", formatMoney(data.totals?.equipmentCost, currency)],
                  ["Subcontractors", formatMoney(data.totals?.subcontractCost, currency)],
                  ["Direct cost", formatMoney(data.totals?.directCost, currency)],
                  ["Overhead", formatMoney(data.totals?.overhead, currency)],
                  ["Contingency", formatMoney(data.totals?.contingency, currency)],
                  ["Gross profit", formatMoney(data.totals?.grossProfit, currency)],
                  ["Gross margin", formatPercent(data.totals?.grossMargin ?? 0)]
                ].map(([a, b]) => [a, b])}
              />
            </Card>
          ) : null}

          {tab === "activity" ? (
            <Card className="mt-3">
              <CardHeader title="Client activity" subtitle="Recorded from the public quotation link" />
              <MiniTable
                head={["Event", "When"]}
                rows={[
                  data.sentAt ? ["Quotation sent to client", formatRelative(data.sentAt)] : null,
                  data.viewedAt ? [`Opened by client (${data.views} times)`, formatRelative(data.viewedAt)] : null,
                  data.status === "ACCEPTED" ? ["Accepted by client", formatRelative(data.viewedAt ?? data.createdAt)] : null,
                  data.status === "REJECTED" ? ["Declined by client", formatRelative(data.viewedAt ?? data.createdAt)] : null
                ].filter(Boolean) as React.ReactNode[][]}
                empty="No client activity recorded yet."
              />
            </Card>
          ) : null}

          {tab === "versions" ? (
            <Card className="mt-3">
              <CardHeader title="Version history" subtitle="Issued documents are never overwritten" />
              <MiniTable
                head={["Version", "Amount", "Status", "Created"]}
                rows={Array.from({ length: data.version }).map((_, i) => [
                  `v${i + 1}`,
                  formatMoney(data.amount * (1 - (data.version - i - 1) * 0.04), currency, 0),
                  i + 1 === data.version ? <StatusBadge key="s" status={data.status} /> : <StatusBadge key="s" status="ARCHIVED" />,
                  formatDate(data.createdAt)
                ])}
              />
            </Card>
          ) : null}
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader title="Client link" subtitle="Tokenised, no tenant or database ids" />
            <div className="p-4">
              <p className="num break-all rounded border border-hairline bg-sunken px-2 py-1.5 text-xs">{shareUrl}</p>
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>Copy</Button>
                <ButtonLink size="sm" href={`/q/${data.token}`} target="_blank">Open</ButtonLink>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Summary" />
            <dl className="divide-y divide-hairline text-sm">
              <Row label="Total" value={formatMoney(data.amount, currency, 0)} padded />
              <Row label="Margin" value={formatPercent(data.amount ? ((data.amount - data.cost) / data.amount) * 100 : 0)} padded />
              <Row label="Owner" value={data.owner} padded />
              <Row label="Views" value={String(data.views)} padded />
              <Row label="Expiry" value={formatDate(data.expiry)} padded />
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value, padded }: { label: string; value: React.ReactNode; padded?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${padded ? "px-4 py-2" : ""}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}
