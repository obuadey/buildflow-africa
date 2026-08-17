"use client";

import { useState } from "react";

import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Modal } from "../../../../components/ui/Overlay";
import { Badge } from "../../../../components/ui/Badge";
import { MiniTable } from "../../../../components/ui/Tabs";
import { useList } from "../../../../lib/client";
import { formatDate, formatMoney } from "../../../../lib/format";
import type { TeamMember } from "../../../../lib/types";

const PLANS: { name: string; price: number; blurb: string }[] = [
  { name: "Starter", price: 180, blurb: "Up to 3 users, full estimating and quotation workflow." },
  { name: "Business", price: 320, blurb: "Unlimited users, contracts, variations and reporting." },
  { name: "Enterprise", price: 0, blurb: "Multiple companies, custom documents, priority support." }
];

export default function BillingSettingsPage() {
  const { tenant } = useTenantContext();
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changePlan(plan: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/t/${tenant.slug}/settings/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    setBusy(false);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      setError(problem.message ?? "That plan could not be applied.");
      return;
    }
    setChanging(false);
    window.location.reload();
  }
  const { rows: team } = useList<TeamMember>("team", { size: 50 });
  const seats = team.filter((t) => t.status !== "DISABLED").length;
  const perSeat = 180;

  return (
    <>
      <Card>
        <CardHeader
          title="Subscription"
          subtitle={`${tenant.name} is on the ${tenant.plan} plan.`}
          action={<Button variant="primary" onClick={() => setChanging(true)}>Change plan</Button>}
        />
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {[
            ["Plan", tenant.plan],
            ["Active seats", `${seats}`],
            ["Monthly total", formatMoney(seats * perSeat, tenant.currency, 0)]
          ].map(([label, value]) => (
            <div key={label}>
              <p className="label-micro">{label}</p>
              <p className="num mt-1 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-hairline px-4 py-2.5 text-sm text-muted">
          Billed in {tenant.currency} at {formatMoney(perSeat, tenant.currency, 0)} per active seat per month. Deactivated users are not billed.
        </p>
      </Card>

      <Card>
        <CardHeader title="Billing history" action={<Badge tone="success">Up to date</Badge>} />
        <MiniTable
          head={["Period", "Seats", "Amount", "Status"]}
          rows={Array.from({ length: 6 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return [
              formatDate(d),
              String(seats),
              formatMoney(seats * perSeat, tenant.currency, 0),
              <Badge key="s" tone="success">Paid</Badge>
            ];
          })}
        />
      </Card>
      <Modal
        open={changing}
        onClose={() => setChanging(false)}
        title="Change plan"
        description="Seats are billed monthly. A change applies from the next billing run."
      >
        <ul className="space-y-2">
          {PLANS.map((plan) => (
            <li key={plan.name} className="flex items-center justify-between gap-4 rounded-lg border border-hairline p-3">
              <span>
                <span className="block text-base font-medium">{plan.name}</span>
                <span className="block text-sm text-muted">{plan.blurb}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="num text-sm text-muted">
                  {plan.price ? `${formatMoney(plan.price, tenant.currency, 0)} / seat` : "By agreement"}
                </span>
                <Button
                  variant={tenant.plan === plan.name ? "secondary" : "primary"}
                  disabled={busy || tenant.plan === plan.name}
                  onClick={() => changePlan(plan.name)}
                >
                  {tenant.plan === plan.name ? "Current" : "Choose"}
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {error ? <p className="mt-3 rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
      </Modal>
    </>
  );
}
