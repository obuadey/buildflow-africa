"use client";

import { useState } from "react";
import { Drawer } from "../ui/Overlay";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { createRecord, patchRecord } from "../../lib/client";
import { useTenantContext } from "./TenantProvider";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "email" | "tel";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
  full?: boolean;
};

export function CreateRecordDrawer({
  open, onClose, resource, title, subtitle, fields, onCreated, submitLabel, recordId, initialValues
}: {
  open: boolean;
  onClose: () => void;
  resource: string;
  title: string;
  subtitle?: string;
  fields: FormField[];
  onCreated?: () => void;
  submitLabel?: string;
  recordId?: string;
  initialValues?: Record<string, unknown>;
}) {
  const { tenant } = useTenantContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = data[field.name];
      if (raw === undefined || raw === "") continue;
      payload[field.name] = field.type === "number" ? Number(raw) : raw;
    }
    setBusy(true);
    setError(null);
    try {
      if (recordId) {
        await patchRecord(tenant.slug, resource, recordId, payload);
      } else {
        await createRecord(tenant.slug, resource, payload);
      }
      form.reset();
      onCreated?.();
      onClose();
    } catch (e) {
      setError((e as { message?: string }).message ?? "The record could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle} width="max-w-lg">
      <form
        key={`${recordId ?? "new"}-${JSON.stringify(initialValues ?? {})}`}
        onSubmit={submit}
        className="flex h-full flex-col"
      >
        <div className="grid flex-1 content-start gap-3 p-3 sm:grid-cols-2">
          {fields.map((field) => {
            const raw = initialValues?.[field.name] ?? field.defaultValue ?? "";
            const value = field.type === "date" && typeof raw === "string" ? raw.slice(0, 10) : String(raw);
            return (
              <Field
                key={field.name}
                label={field.label}
                required={field.required}
                hint={field.hint}
                className={field.full || field.type === "textarea" ? "sm:col-span-2" : ""}
              >
                {field.type === "select" ? (
                  <Select name={field.name} required={field.required} defaultValue={value}>
                    <option value="" disabled>Select…</option>
                    {(field.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea name={field.name} rows={3} placeholder={field.placeholder} required={field.required} defaultValue={value} />
                ) : (
                  <Input
                    name={field.name}
                    type={field.type ?? "text"}
                    step={field.type === "number" ? "0.01" : undefined}
                    placeholder={field.placeholder}
                    required={field.required}
                    defaultValue={value}
                  />
                )}
              </Field>
            );
          })}
          {error ? <p className="sm:col-span-2 rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : submitLabel ?? (recordId ? "Save changes" : "Create")}</Button>
        </div>
      </form>
    </Drawer>
  );
}
