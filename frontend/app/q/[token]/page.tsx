"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Download, MessageSquare, X } from "lucide-react";
import { Logo } from "../../../components/brand/Logo";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Textarea } from "../../../components/ui/Field";
import { StatusBadge } from "../../../components/ui/Badge";
import { SkeletonText } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/EmptyState";
import { formatDate, formatMoney, formatNumber } from "../../../lib/format";

type PublicQuote = {
  company: { name: string; region: string; city: string; initials: string; tin: string };
  quote: { id: string; version: number; status: string; expiry: string; amount: number; project: string; client: string; owner: string };
  sections: { name: string; items: { description: string; quantity: number; unit: string; rate: number; amount: number }[] }[];
  summary: { subtotal: number; tax: number; discount: number; total: number } | null;
};

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/public/quote/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message);
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function respond(next: "ACCEPTED" | "REJECTED" | "NEGOTIATING") {
    setBusy(true);
    const response = await fetch(`/api/public/quote/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: next, comment })
    });
    if (response.ok) setDecision(next);
    setBusy(false);
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md">
          <ErrorState title="This quotation link is not available." message="It may have expired or been withdrawn. Please contact the contractor for an up-to-date link." />
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card className="p-8"><SkeletonText lines={10} /></Card>
      </div>
    );
  }

  const currency = "GHS";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-surface no-print">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo size={22} />
          <span className="text-sm text-muted">Quotation for {data.quote.client}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {decision ? (
          <div
            role="status"
            className={`mb-4 rounded-lg border px-4 py-3 text-base ${
              decision === "ACCEPTED"
                ? "border-success/25 bg-success/10 text-success"
                : decision === "REJECTED"
                ? "border-danger/25 bg-danger/10 text-danger"
                : "border-info/25 bg-info/10 text-info"
            }`}
          >
            {decision === "ACCEPTED"
              ? "Thank you  your acceptance has been recorded and the contractor has been notified."
              : decision === "REJECTED"
              ? "Your decision has been recorded. The contractor has been notified."
              : "Your request for changes has been sent to the contractor."}
          </div>
        ) : null}

        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/12 text-base font-semibold text-accent">
                {data.company.initials}
              </span>
              <p className="mt-3 text-lg font-semibold tracking-tight">{data.company.name}</p>
              <p className="text-sm text-muted">{data.company.city}, {data.company.region}</p>
              {data.company.tin ? <p className="num text-sm text-muted">TIN {data.company.tin}</p> : null}
            </div>
            <div className="text-right">
              <p className="label-micro">Quotation</p>
              <p className="num text-lg font-semibold">{data.quote.id}</p>
              <p className="num text-sm text-muted">Version {data.quote.version}</p>
              <p className="num text-sm text-muted">Valid until {formatDate(data.quote.expiry)}</p>
              <div className="mt-2 flex justify-end"><StatusBadge status={data.quote.status} /></div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-hairline py-5 sm:grid-cols-2">
            <div>
              <p className="label-micro">Prepared for</p>
              <p className="mt-1 text-base font-medium">{data.quote.client}</p>
            </div>
            <div>
              <p className="label-micro">Project</p>
              <p className="mt-1 text-base font-medium">{data.quote.project}</p>
            </div>
          </div>

          {data.sections.map((section) => (
            <div key={section.name} className="py-4">
              <p className="label-micro mb-1.5">{section.name}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-hairline">
                      {["Description", "Qty", "Unit", "Rate", "Amount"].map((h, i) => (
                        <th key={h} scope="col" className={`px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, i) => (
                      <tr key={i} className="border-b border-hairline last:border-0">
                        <td className="px-2 py-2 text-sm">{item.description}</td>
                        <td className="num px-2 py-2 text-right text-sm">{formatNumber(item.quantity)}</td>
                        <td className="num px-2 py-2 text-right text-sm">{item.unit}</td>
                        <td className="num px-2 py-2 text-right text-sm">{formatMoney(item.rate, currency)}</td>
                        <td className="num px-2 py-2 text-right text-sm font-medium">{formatMoney(item.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <dl className="ml-auto w-full max-w-xs space-y-1 border-t border-hairline pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="num">{formatMoney(data.summary?.subtotal, currency)}</dd></div>
            {data.summary?.discount ? <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="num">− {formatMoney(data.summary.discount, currency)}</dd></div> : null}
            <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd className="num">{formatMoney(data.summary?.tax, currency)}</dd></div>
            <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold">
              <dt>Total</dt><dd className="num">{formatMoney(data.quote.amount, currency)}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-4 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="label-micro mb-1">Payment terms</p>
              <p className="text-muted">50% mobilisation, 30% at superstructure, 20% on completion.</p>
            </div>
            <div>
              <p className="label-micro mb-1">Exclusions</p>
              <p className="text-muted">Statutory permits, utility connection fees, furniture and loose fittings.</p>
            </div>
          </div>
        </Card>

        {!decision ? (
          <Card className="mt-3 p-4 no-print">
            <p className="text-base font-semibold">Your decision</p>
            <p className="mt-1 text-sm text-muted">
              Accepting records your approval with a timestamp and device details, and notifies {data.quote.owner}.
            </p>
            {commenting ? (
              <Textarea
                className="mt-3"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Let the contractor know what you would like changed…"
                aria-label="Comment"
              />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => respond("ACCEPTED")} disabled={busy}><Check className="h-4 w-4" /> Accept quotation</Button>
              <Button onClick={() => { setCommenting(true); if (comment.trim()) respond("NEGOTIATING"); }} disabled={busy}>
                <MessageSquare className="h-4 w-4" /> {commenting ? "Send request" : "Request changes"}
              </Button>
              <Button variant="danger" onClick={() => respond("REJECTED")} disabled={busy}><X className="h-4 w-4" /> Decline</Button>
              <Button className="ml-auto" onClick={() => window.print()}><Download className="h-4 w-4" /> Download</Button>
            </div>
          </Card>
        ) : null}

        <p className="mt-6 text-center text-xs text-subtle no-print">
          Sent securely with BuildFlow Africa. This link is unique to you; please do not share it.
        </p>
      </main>
    </div>
  );
}
