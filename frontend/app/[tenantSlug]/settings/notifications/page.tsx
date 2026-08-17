"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useSettings } from "../../../../components/app/useSettings";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Toggle } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";

const LABELS: Record<string, { title: string; detail: string }> = {
  quoteViewed: { title: "Quotation viewed", detail: "A client opened a quotation link." },
  quoteAccepted: { title: "Quotation accepted", detail: "A client accepted or rejected a quotation." },
  invoiceDue: { title: "Invoice due soon", detail: "An invoice falls due within seven days." },
  invoiceOverdue: { title: "Invoice overdue", detail: "An invoice has passed its due date." },
  paymentReceived: { title: "Payment received", detail: "A payment was recorded against an invoice." },
  variationApproved: { title: "Variation approved", detail: "A change order was approved by the client." },
  priceStale: { title: "Material price outdated", detail: "A rate has not been updated in 60 days." },
  budgetWarning: { title: "Project budget warning", detail: "Cost is running ahead of reported progress." }
};

export default function NotificationSettingsPage() {
  const { data, save, saving, saved } = useSettings();
  const [values, setValues] = useState<Record<string, boolean>>({});
  useEffect(() => { if (data) setValues(data.notifications); }, [data]);

  if (!data) return <Card className="p-6"><SkeletonText lines={6} /></Card>;

  return (
    <>
      <Card>
        <CardHeader title="Notifications" subtitle="In-app now; email, WhatsApp and SMS channels use the same event model." />
        <ul className="divide-y divide-hairline">
          {Object.keys(LABELS).map((key) => (
            <li key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-base font-medium">{LABELS[key].title}</p>
                <p className="text-sm text-muted">{LABELS[key].detail}</p>
              </div>
              <Toggle
                checked={Boolean(values[key])}
                onChange={(v) => setValues((s) => ({ ...s, [key]: v }))}
                label={LABELS[key].title}
              />
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex items-center justify-end gap-3">
        {saved ? <span className="flex items-center gap-1 text-sm text-success" role="status"><Check className="h-4 w-4" /> Saved</span> : null}
        <Button variant="primary" disabled={saving} onClick={() => save({ notifications: values })}>{saving ? "Saving…" : "Save preferences"}</Button>
      </div>
    </>
  );
}
