"use client";

import { Check } from "lucide-react";
import { useSettings } from "../../../../components/app/useSettings";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Field, Input } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";

const PREVIEW = (pattern: string) =>
  pattern.replace("{YYYY}", String(new Date().getFullYear())).replace("{0000}", "0001");

export default function NumberingSettingsPage() {
  const { data, save, saving, saved } = useSettings();
  if (!data) return <Card className="p-6"><SkeletonText lines={5} /></Card>;

  const fields: { key: keyof typeof data.numbering; label: string }[] = [
    { key: "project", label: "Projects" },
    { key: "estimate", label: "Estimates" },
    { key: "quotation", label: "Quotations" },
    { key: "invoice", label: "Invoices" },
    { key: "variation", label: "Variations" }
  ];

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.currentTarget).entries());
        await save({
          numbering: {
            project: String(v.project), estimate: String(v.estimate), quotation: String(v.quotation),
            invoice: String(v.invoice), variation: String(v.variation)
          }
        });
      }}
      className="space-y-3"
    >
      <Card>
        <CardHeader title="Document numbering" subtitle="Sequences are per company. {YYYY} inserts the year, {0000} the padded counter." />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {fields.map((field) => (
            <Field key={field.key} label={field.label} hint={`e.g. ${PREVIEW(data.numbering[field.key])}`}>
              <Input name={field.key} defaultValue={data.numbering[field.key]} className="num" />
            </Field>
          ))}
        </div>
      </Card>
      <div className="flex items-center justify-end gap-3">
        {saved ? <span className="flex items-center gap-1 text-sm text-success" role="status"><Check className="h-4 w-4" /> Saved</span> : null}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save numbering"}</Button>
      </div>
    </form>
  );
}
