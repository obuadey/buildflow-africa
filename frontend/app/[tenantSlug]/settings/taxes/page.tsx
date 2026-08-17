"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, Edit3, MoreHorizontal, Plus, RotateCcw, ShieldOff, Trash2 } from "lucide-react";
import { useTenantSlug } from "../../../../lib/tenant";
import { createRecord, deleteRecord, downloadCsv, patchRecord, postJson, toCsv, useList } from "../../../../lib/client";
import { formatDate, formatDateInput } from "../../../../lib/format";
import { Badge } from "../../../../components/ui/Badge";
import { Button, IconButton } from "../../../../components/ui/Button";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Field, Input, Select } from "../../../../components/ui/Field";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../../../../components/ui/Menu";
import { Modal } from "../../../../components/ui/Overlay";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { DataTable, type Column } from "../../../../components/ui/DataTable";

type TaxRate = {
  id: string;
  name: string;
  rate: number;
  effectiveFrom: string;
  appliesTo: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function TaxSettingsPage() {
  const slug = useTenantSlug();
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [busy, setBusy] = useState(false);
  const { rows, loading, error, refresh } = useList<TaxRate>("taxRates", { status });

  const active = rows.filter((row) => row.active);
  const totalRate = active.reduce((sum, row) => sum + Number(row.rate || 0), 0);

  const columns = useMemo<Column<TaxRate>[]>(() => [
    {
      key: "name",
      header: "Tax",
      sortable: true,
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-fg">{row.name}</p>
          <p className="text-xs text-subtle">{row.active ? "Active" : "Inactive"}</p>
        </div>
      ),
      csv: (row) => row.name
    },
    {
      key: "rate",
      header: "Rate %",
      align: "right",
      sortable: true,
      render: (row) => <span className="num font-medium">{Number(row.rate).toFixed(2)}%</span>,
      csv: (row) => Number(row.rate).toFixed(4)
    },
    {
      key: "effectiveFrom",
      header: "Effective from",
      render: (row) => formatDate(row.effectiveFrom),
      csv: (row) => row.effectiveFrom
    },
    { key: "appliesTo", header: "Applies to", csv: (row) => row.appliesTo ?? "" },
    {
      key: "active",
      header: "Status",
      render: (row) => <Badge tone={row.active ? "success" : "neutral"}>{row.active ? "Active" : "Inactive"}</Badge>,
      csv: (row) => row.active ? "Active" : "Inactive"
    },
    {
      key: "updatedAt",
      header: "Updated",
      defaultHidden: true,
      render: (row) => formatDate(row.updatedAt),
      csv: (row) => row.updatedAt
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      hideable: false,
      render: (row) => (
        <TaxActions
          row={row}
          slug={slug}
          onEdit={() => setEditing(row)}
          onChanged={refresh}
        />
      ),
      csv: () => ""
    }
  ], [refresh, slug]);

  async function resetGhanaDefaults() {
    if (!window.confirm("Replace this company's tax rates with Ghana defaults?")) return;
    setBusy(true);
    try {
      await postJson(`/api/t/${slug}/taxRates/reset-ghana-defaults`, {});
      refresh();
    } catch (err) {
      window.alert((err as { message?: string }).message ?? "Ghana defaults could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !rows.length) return <Card className="p-6"><SkeletonText lines={5} /></Card>;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="px-4 py-3">
          <p className="label-micro">Configured taxes</p>
          <p className="num mt-1 text-3xl font-semibold">{rows.length}</p>
          <p className="mt-1 text-xs text-muted">loaded from the database</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="label-micro">Active taxes</p>
          <p className="num mt-1 text-3xl font-semibold">{active.length}</p>
          <p className="mt-1 text-xs text-muted">available to calculations</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="label-micro">Combined active rate</p>
          <p className="num mt-1 text-3xl font-semibold">{totalRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-muted">for selected active rows</p>
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader
          title="Tax rates"
          subtitle="Ghana defaults are loaded from the backend when a company has no tax rows."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label="Filter tax rates" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              <Button size="sm" onClick={resetGhanaDefaults} disabled={busy}>
                <RotateCcw className="h-3.5 w-3.5" /> Ghana defaults
              </Button>
              <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          }
        />
        <DataTable
          rows={rows}
          columns={columns}
          getId={(row) => row.id}
          loading={loading}
          error={error}
          total={rows.length}
          exportName="tax-rates"
          dense
          empty={{
            title: "No tax rates configured",
            description: "Load Ghana defaults or add a custom tax rate.",
            action: <Button variant="primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add tax rate</Button>
          }}
        />
      </Card>

      <TaxModal
        open={modalOpen}
        slug={slug}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
      <TaxModal
        open={Boolean(editing)}
        slug={slug}
        tax={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </>
  );
}

function TaxActions({ row, slug, onEdit, onChanged }: {
  row: TaxRate;
  slug: string;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function action(name: string) {
    setBusy(true);
    try {
      await postJson(`/api/t/${slug}/taxRates/${row.id}/${name}`, {});
      onChanged();
    } catch (err) {
      window.alert((err as { message?: string }).message ?? "The tax-rate action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteRecord(slug, "taxRates", row.id);
      onChanged();
    } catch (err) {
      window.alert((err as { message?: string }).message ?? "The tax rate could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  function exportOne() {
    downloadCsv(`tax-rate-${row.id}.csv`, toCsv([row as unknown as Record<string, unknown>], [
      { key: "name", label: "Tax" },
      { key: "rate", label: "Rate %" },
      { key: "effectiveFrom", label: "Effective from" },
      { key: "appliesTo", label: "Applies to" },
      { key: "active", label: "Active" },
      { key: "updatedAt", label: "Updated" }
    ]));
  }

  return (
    <Menu
      width="w-56"
      trigger={({ toggle }) => (
        <IconButton label={`Actions for ${row.name}`} variant="secondary" disabled={busy} onClick={(event) => { event.stopPropagation(); toggle(); }}>
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Tax rate</MenuLabel>
          <MenuItem icon={Edit3} onClick={() => { close(); onEdit(); }}>View / edit</MenuItem>
          <MenuItem icon={Copy} onClick={() => { close(); void action("duplicate"); }}>Duplicate</MenuItem>
          <MenuItem icon={Download} onClick={() => { close(); exportOne(); }}>Export row</MenuItem>
          <MenuSeparator />
          {row.active ? (
            <MenuItem icon={ShieldOff} onClick={() => { close(); void action("deactivate"); }}>Deactivate</MenuItem>
          ) : (
            <MenuItem icon={CheckCircle2} onClick={() => { close(); void action("activate"); }}>Activate</MenuItem>
          )}
          <MenuSeparator />
          <MenuItem icon={Trash2} danger onClick={() => { close(); void remove(); }}>Delete</MenuItem>
        </>
      )}
    </Menu>
  );
}

function TaxModal({ open, slug, tax, onClose, onSaved }: {
  open: boolean;
  slug: string;
  tax?: TaxRate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) {
      setError("Give the tax rate a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      name,
      rate: Number(form.get("rate") || 0),
      effectiveFrom: String(form.get("effectiveFrom") || new Date().toISOString().slice(0, 10)),
      appliesTo: String(form.get("appliesTo") || "").trim(),
      active: String(form.get("active") || "true") === "true"
    };
    try {
      if (tax) {
        await patchRecord(slug, "taxRates", tax.id, body);
      } else {
        await createRecord(slug, "taxRates", body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? "The tax rate could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tax ? "Edit tax rate" : "New tax rate"}
      description="Create or update a backend tax rate for this company."
    >
      <form key={tax?.id ?? "new"} className="grid gap-3" onSubmit={submit}>
        <Field label="Tax name" required>
          <Input name="name" required data-autofocus defaultValue={tax?.name ?? ""} placeholder="VAT" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rate %" required>
            <Input name="rate" required type="number" min="0" step="0.0001" defaultValue={tax?.rate ?? 0} className="num text-right" />
          </Field>
          <Field label="Effective from" required>
            <Input name="effectiveFrom" required type="date" defaultValue={formatDateInput(tax?.effectiveFrom ?? new Date().toISOString().slice(0, 10))} />
          </Field>
        </div>
        <Field label="Applies to">
          <Input name="appliesTo" defaultValue={tax?.appliesTo ?? ""} placeholder="Standard taxable supplies" />
        </Field>
        <Field label="Status">
          <Select name="active" defaultValue={tax?.active === false ? "false" : "true"}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </Field>
        {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> {busy ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
