"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Ban, Download, Send, Wallet } from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { StatusBadge } from "../../../../components/ui/Badge";
import { MiniTable } from "../../../../components/ui/Tabs";
import { Modal } from "../../../../components/ui/Overlay";
import { Field, Input, Select } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { ErrorState } from "../../../../components/ui/EmptyState";
import { patchRecord, useRecord } from "../../../../lib/client";
import { dueLabel, formatDate, formatMoney, humanize } from "../../../../lib/format";
import { tenantPath } from "../../../../lib/tenant";
import type { Invoice, Payment, Project } from "../../../../lib/types";

type Detail = Invoice & { payments: Payment[]; project: Project | null };

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { tenant } = useTenantContext();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const { data, loading, error, refresh } = useRecord<Detail>("invoices", invoiceId);
  const [paying, setPaying] = useState(false);
  const currency = tenant.currency;

  if (loading) return <Card className="p-6"><SkeletonText lines={7} /></Card>;
  if (error || !data) return <Card><ErrorState title="We couldn't load this invoice." message={error?.message} onRetry={refresh} /></Card>;

  const outstanding = data.total - data.paid;

  async function recordPayment(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form).entries());
    const amount = Number(values.amount);
    await fetch(`/api/t/${tenant.slug}/invoices/${data!.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        method: values.method,
        paidOn: values.date || undefined,
        reference: values.reference || undefined
      })
    });
    setPaying(false);
    refresh();
  }

  return (
    <>
      <PageHeader
        title={`Invoice ${data.reference}`}
        meta={<StatusBadge status={data.status} />}
        description={<>{data.clientName} · <Link href={path(`/projects/${data.projectId}`)} className="hover:text-accent">{data.projectName}</Link> · {dueLabel(data.dueDate)}</>}
        actions={
          <>
            <Button onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
            {data.status === "DRAFT" ? (
              <Button onClick={async () => { await fetch(`/api/t/${tenant.slug}/invoices/${data.id}/send`, { method: "POST" }); refresh(); }}>
                <Send className="h-4 w-4" /> Send
              </Button>
            ) : null}
            {data.status !== "CANCELLED" ? (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!window.confirm(`Cancel ${data.reference}? This keeps the invoice for audit but removes it from open collections.`)) return;
                  await patchRecord(tenant.slug, "invoices", data.id, { status: "CANCELLED" });
                  refresh();
                }}
              >
                <Ban className="h-4 w-4" /> Cancel
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => setPaying(true)} disabled={outstanding <= 0}>
              <Wallet className="h-4 w-4" /> Record payment
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Invoice total", formatMoney(data.total, currency, 0)],
          ["Paid", formatMoney(data.paid, currency, 0)],
          ["Outstanding", formatMoney(outstanding, currency, 0)],
          ["Due", formatDate(data.dueDate)]
        ].map(([label, value]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            <p className="num mt-1 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Payments received" subtitle={`${data.payments.length} recorded against this invoice`} />
          <MiniTable
            head={["Reference", "Method", "Date", "Amount"]}
            rows={data.payments.map((p) => [p.reference, humanize(p.method), formatDate(p.date), formatMoney(p.amount, currency, 0)])}
            empty="No payments recorded yet."
          />
        </Card>

        <Card>
          <CardHeader title="Invoice details" />
          <dl className="divide-y divide-hairline text-sm">
            {[
              ["Type", humanize(data.type)],
              ["Issued", formatDate(data.issueDate)],
              ["Due", formatDate(data.dueDate)],
              ["Client", data.clientName],
              ["Project", data.projectName],
              ["Status", humanize(data.status)]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-2">
                <dt className="text-muted">{label}</dt>
                <dd className="num max-w-[60%] truncate text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Modal
        open={paying}
        onClose={() => setPaying(false)}
        title="Record payment"
        description={`${formatMoney(outstanding, currency, 0)} outstanding on ${data.reference}`}
      >
        <form
          id="payment-form"
          onSubmit={(e) => { e.preventDefault(); recordPayment(e.currentTarget); }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="Amount" required>
            <Input name="amount" type="number" step="0.01" max={outstanding} defaultValue={outstanding} required data-autofocus />
          </Field>
          <Field label="Method" required>
            <Select name="method" defaultValue="BANK_TRANSFER">
              {["BANK_TRANSFER", "MOBILE_MONEY", "CASH", "CHEQUE", "CARD", "OTHER"].map((m) => (
                <option key={m} value={m}>{humanize(m)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Reference"><Input name="reference" placeholder="MOMO-482913" /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setPaying(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Record payment</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
