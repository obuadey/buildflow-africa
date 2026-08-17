"use client";

import { Check } from "lucide-react";
import { useSettings } from "../../../components/app/useSettings";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Select, Toggle } from "../../../components/ui/Field";
import { SkeletonText } from "../../../components/ui/Skeleton";
import { useState, useEffect } from "react";

import { useReference } from "../../../lib/reference";

export default function CompanySettingsPage() {
  const reference = useReference();
  const { data, save, saving, saved } = useSettings();
  const [vat, setVat] = useState(true);
  useEffect(() => { if (data) setVat(data.company.vatRegistered); }, [data]);

  if (!data) return <Card className="p-6"><SkeletonText lines={8} /></Card>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget).entries());
        await save({
          company: {
            name: String(values.name), phone: String(values.phone), email: String(values.email),
            address: String(values.address), region: String(values.region), city: String(values.city),
            website: String(values.website), tin: String(values.tin), vatRegistered: vat
          },
          defaults: {
            currency: String(values.currency), markup: Number(values.markup), overhead: Number(values.overhead),
            profit: Number(values.profit), validityDays: Number(values.validityDays), paymentTerms: String(values.paymentTerms)
          }
        });
      }}
      className="space-y-3"
    >
      <Card>
        <CardHeader title="Company profile" subtitle="Appears on quotations, invoices and client documents." />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Company name" required><Input name="name" defaultValue={data.company.name} required /></Field>
          <Field label="Phone"><Input name="phone" type="tel" defaultValue={data.company.phone} /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={data.company.email} /></Field>
          <Field label="Website"><Input name="website" defaultValue={data.company.website} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input name="address" defaultValue={data.company.address} /></Field>
          <Field label="Region">
            <Select name="region" defaultValue={data.company.region}>
              {reference.regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="City"><Input name="city" defaultValue={data.company.city} /></Field>
          <Field label="TIN"><Input name="tin" defaultValue={data.company.tin} /></Field>
          <div className="flex items-end gap-3 pb-1">
            <Toggle checked={vat} onChange={setVat} label="VAT registered" />
            <span className="text-sm">VAT registered</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Estimating defaults" subtitle="Applied to new estimates;each estimate can still be adjusted." />
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Field label="Currency">
            <Select name="currency" defaultValue={data.defaults.currency}>
              {["GHS", "NGN", "KES", "RWF", "UGX", "USD"].map((c: string) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Default markup %"><Input name="markup" type="number" step="0.1" defaultValue={data.defaults.markup} /></Field>
          <Field label="Default overhead %"><Input name="overhead" type="number" step="0.1" defaultValue={data.defaults.overhead} /></Field>
          <Field label="Target profit margin %"><Input name="profit" type="number" step="0.1" defaultValue={data.defaults.profit} /></Field>
          <Field label="Quote validity (days)"><Input name="validityDays" type="number" defaultValue={data.defaults.validityDays} /></Field>
          <Field label="Payment terms" className="sm:col-span-3"><Input name="paymentTerms" defaultValue={data.defaults.paymentTerms} /></Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved ? <span className="flex items-center gap-1 text-sm text-success" role="status"><Check className="h-4 w-4" /> Saved</span> : null}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
