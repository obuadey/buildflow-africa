"use client";

import { Check } from "lucide-react";
import { useSettings } from "../../../../components/app/useSettings";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Field, Input, Textarea } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { LogoMark } from "../../../../components/brand/Logo";
import { FileUpload } from "../../../../components/app/FileUpload";

export default function BrandingSettingsPage() {
  const { data, save, saving, saved } = useSettings();
  const { tenant } = useTenantContext();
  if (!data) return <Card className="p-6"><SkeletonText lines={6} /></Card>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.currentTarget).entries());
        await save({
          branding: {
            accent: String(v.accent), footer: String(v.footer), introduction: String(v.introduction),
            exclusions: String(v.exclusions), bank: String(v.bank), momo: String(v.momo)
          }
        });
      }}
      className="space-y-3"
    >
      <Card>
        <CardHeader title="Document branding" subtitle="Applied to quotations, proposals and invoices sent to clients." />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-hairline bg-sunken p-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface">
              <LogoMark size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-base font-medium">{tenant.name} logo</p>
              <p className="text-sm text-muted">PNG or SVG, at least 240 px wide, transparent background.</p>
            </div>
            <span className="ml-auto"><FileUpload
              kind="PHOTO"
              label="Upload logo"
              accept=".png,.jpg,.jpeg,.webp"
              variant="secondary"
              onUploaded={(document) => save({ branding: { ...data.branding, logo: document.id } })}
            /></span>
          </div>
          <Field label="Accent colour" hint="checked for contrast before use">
            <Input name="accent" type="color" defaultValue={data.branding.accent} className="h-9 p-1" />
          </Field>
          <Field label="Document footer"><Input name="footer" defaultValue={data.branding.footer} /></Field>
          <Field label="Default introduction" className="sm:col-span-2">
            <Textarea name="introduction" rows={2} defaultValue={data.branding.introduction} />
          </Field>
          <Field label="Default exclusions" className="sm:col-span-2">
            <Textarea name="exclusions" rows={2} defaultValue={data.branding.exclusions} />
          </Field>
          <Field label="Bank details"><Input name="bank" defaultValue={data.branding.bank} /></Field>
          <Field label="Mobile Money details"><Input name="momo" defaultValue={data.branding.momo} /></Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved ? <span className="flex items-center gap-1 text-sm text-success" role="status"><Check className="h-4 w-4" /> Saved</span> : null}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save branding"}</Button>
      </div>
    </form>
  );
}
