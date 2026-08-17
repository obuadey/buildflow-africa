"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, LayoutTemplate } from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { activeTaxRates, defaultEstimateTaxPct, useSettings } from "../../../../components/app/useSettings";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Field, Input, Select } from "../../../../components/ui/Field";
import { createRecord, postJson, useList } from "../../../../lib/client";
import { formatMoney } from "../../../../lib/format";
import { tenantPath } from "../../../../lib/tenant";
import type { Client, Estimate, Project, Template } from "../../../../lib/types";

export default function NewEstimatePage() {
  const { tenant, user } = useTenantContext();
  const router = useRouter();
  const search = useSearchParams();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const { rows: projects } = useList<Project>("projects", { size: 100 });
  const { rows: clients } = useList<Client>("clients", { size: 100 });
  const { rows: templates } = useList<Template>("templates", { size: 30 });
  const { data: settings } = useSettings();

  const [mode, setMode] = useState<"blank" | "template">(search.get("template") ? "template" : "blank");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taxPct, setTaxPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taxRates = activeTaxRates(settings);

  // Arriving from the templates page with a choice already made.
  const preselected = search.get("template");
  useEffect(() => {
    if (preselected) setMode("template");
  }, [preselected]);
  useEffect(() => {
    const requestedProject = search.get("project");
    if (requestedProject) setProjectId(requestedProject);
  }, [search]);
  useEffect(() => {
    setTaxPct(defaultEstimateTaxPct(settings));
  }, [settings]);

  function link() {
    const project = projects.find((p) => p.id === projectId);
    return { project, client: clients.find((c) => c.id === project?.clientId) };
  }

  async function createBlank() {
    const { project, client } = link();
    setBusy(true);
    setError(null);
    try {
      const estimate = await createRecord<Estimate>(tenant.slug, "estimates", {
        title: title || project?.name || "Untitled estimate",
        projectId: project?.id,
        clientId: client?.id,
        estimator: user.name,
        overheadPct: 8,
        contingencyPct: 3,
        profitPct: 15,
        taxPct,
        discount: 0,
        sections: [{ name: "Preliminaries", items: [] }]
      });
      router.push(path(`/estimates/${estimate.id}`));
    } catch (e) {
      setError((e as { message?: string }).message ?? "The estimate could not be created.");
      setBusy(false);
    }
  }

  /** The template's own sections and lines are rebuilt server-side at today's rates. */
  async function createFromTemplate(templateId: string) {
    const { project, client } = link();
    setBusy(true);
    setError(null);
    try {
      const estimate = await postJson<Estimate>(`/api/t/${tenant.slug}/templates/${templateId}/use`, {
        title: title || project?.name || undefined,
        projectId: project?.id,
        clientId: client?.id,
        taxPct
      });
      router.push(path(`/estimates/${estimate.id}`));
    } catch (e) {
      setError((e as { message?: string }).message ?? "The estimate could not be created.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New estimate"
        description="Start from a blank sheet or a saved template."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {[
          { key: "blank", icon: FileSpreadsheet, title: "Blank estimate", copy: "Build sections and lines yourself from the rate library." },
          { key: "template", icon: LayoutTemplate, title: "From template", copy: "Start from one of your saved estimate structures." }
        ].map((option) => {
          const Icon = option.icon;
          const active = mode === option.key;
          return (
            <button
              key={option.key}
              onClick={() => setMode(option.key as typeof mode)}
              aria-pressed={active}
              className={`rounded-lg border p-4 text-left transition-colors ${active ? "border-accent bg-accent/[0.06]" : "border-hairline bg-surface hover:bg-sunken"}`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-accent" : "text-muted"}`} />
              <p className="mt-2 text-base font-semibold">{option.title}</p>
              <p className="mt-0.5 text-sm text-muted">{option.copy}</p>
            </button>
          );
        })}
      </div>

      <Card className="mt-3">
        <CardHeader title="Estimate details" />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Estimate title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="4 Bedroom Residence  East Legon" />
          </Field>
          <Field label="Project" hint="optional">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Not linked to a project yet</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Tax rate" hint="from Settings > Tax">
            <div className="flex gap-2">
              <Select
                value={taxRates.find((tax) => tax.rate === taxPct)?.id ?? ""}
                onChange={(event) => {
                  const tax = taxRates.find((row) => row.id === event.target.value);
                  setTaxPct(tax?.rate ?? taxPct);
                }}
              >
                <option value="">Custom</option>
                {taxRates.map((tax) => <option key={tax.id} value={tax.id}>{tax.name}</option>)}
              </Select>
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={taxPct}
                onChange={(event) => setTaxPct(Number(event.target.value))}
                className="num w-28 text-right"
                aria-label="Tax percent"
              />
            </div>
          </Field>
        </div>

        {mode === "template" ? (
          <div className="border-t border-hairline p-4">
            <p className="label-micro mb-2">Choose a template</p>
            <p className="mb-3 text-sm text-muted">Rates are taken fresh from your library, not from when the template was saved.</p>
            {templates.length === 0 ? (
              <p className="text-sm text-muted">
                You have no templates yet. Open a finished estimate and choose “Save as template” to reuse its structure.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    disabled={busy}
                    onClick={() => createFromTemplate(t.id)}
                    className={`rounded-lg border p-3 text-left transition-colors disabled:opacity-60 ${t.id === preselected ? "border-accent bg-accent/[0.06]" : "border-hairline hover:border-strongline hover:bg-sunken"}`}
                  >
                    <p className="text-base font-medium">{t.name}</p>
                    <p className="num mt-0.5 text-sm text-muted">{t.sections} sections · {t.items} items · typically {formatMoney(t.typicalValue, tenant.currency, 0)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="mx-4 mb-3 rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        {mode === "blank" ? (
          <div className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">
            <Button variant="primary" onClick={createBlank} disabled={busy || !title.trim()}>Create estimate</Button>
          </div>
        ) : null}
      </Card>
    </>
  );
}
