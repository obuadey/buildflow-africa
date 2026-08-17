"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowUpRight, BarChart3, BookOpen, Boxes, ChevronDown, ChevronRight, Database, Download,
  FileSpreadsheet, Home, Plus, Search, Sparkles, Star, TrendingUp,
  Upload
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Checkbox, Field, Input, Select } from "../../ui/Field";
import { SkeletonText } from "../../ui/Skeleton";
import { Modal } from "../../ui/Overlay";
import { createRecord, downloadCsv, patchRecord, postJson, toCsv, useList } from "../../../lib/client";
import { useTenantContext } from "../TenantProvider";
import { formatMoney, formatNumber } from "../../../lib/format";
import { GHANA_REGIONS } from "../../../lib/regions";
import type { Equipment, LabourRate, Material } from "../../../lib/types";

type CostType = "Material" | "Labor" | "Equipment" | "Operator" | "Database";

type CostRow = {
  id: string;
  resourceId: string;
  resource: "materials" | "labour" | "equipment";
  code: string;
  description: string;
  category: string;
  type: CostType;
  unit: string;
  rate: number;
  min: number;
  max: number;
  currency: string;
  source: string;
  usage: number;
  favorite?: boolean;
};

type AdvisorAnswer = {
  headline: string;
  detail: string;
  rows: { label: string; value: string; href: string }[];
  source: string;
  provider: string;
};

type AiHealth = {
  status: string;
  provider: string;
  model: string | null;
  configured: boolean;
};

/**
 * The company's own rate library, as the cost pages show it.
 *
 * These pages used to blend in a fixed table of European reference rates and label every row EUR.
 * A contractor in Accra pricing from that would have been quoting invented figures in the wrong
 * currency, so nothing appears here now unless the company entered it.
 */
function fromApi(materials: Material[], labour: LabourRate[], equipment: Equipment[], currency: string) {
  const materialRows = materials.map<CostRow>((m) => ({
    id: `mat-${m.id}`,
    resourceId: m.id,
    resource: "materials",
    code: m.id.toUpperCase().slice(0, 12),
    description: m.name,
    category: m.category,
    type: "Material",
    unit: m.unit,
    rate: m.sellingRate || m.cost,
    min: (m.cost || m.sellingRate) * 0.86,
    max: (m.sellingRate || m.cost) * 1.18,
    currency,
    source: m.source,
    usage: 0
  }));
  const labourRows = labour.map<CostRow>((l) => ({
    id: `lab-${l.id}`,
    resourceId: l.id,
    resource: "labour",
    code: l.id.toUpperCase().slice(0, 12),
    description: l.trade,
    category: `Labor - ${l.trade}`,
    type: "Labor",
    unit: l.unit,
    rate: l.rate,
    min: l.rate * 0.84,
    max: l.rate * 1.2,
    currency,
    source: l.region || "Tenant",
    usage: 0
  }));
  const equipmentRows = equipment.map<CostRow>((e) => ({
    id: `eq-${e.id}`,
    resourceId: e.id,
    resource: "equipment",
    code: e.id.toUpperCase().slice(0, 12),
    description: e.name,
    category: "Equipment",
    type: "Equipment",
    unit: e.unit,
    rate: e.hireRate + e.transport + e.operatorCost,
    min: e.hireRate * 0.84,
    max: (e.hireRate + e.transport + e.operatorCost) * 1.18,
    currency,
    source: e.supplierName || "Tenant",
    usage: 0
  }));
  return [...materialRows, ...labourRows, ...equipmentRows];
}

function useCostRows() {
  const { tenant } = useTenantContext();
  const { rows: materials, loading: loadingMaterials, refresh: refreshMaterials } = useList<Material>("materials", { size: 200 });
  const { rows: labour, loading: loadingLabour, refresh: refreshLabour } = useList<LabourRate>("labour", { size: 200 });
  const { rows: equipment, loading: loadingEquipment, refresh: refreshEquipment } = useList<Equipment>("equipment", { size: 200 });
  const rows = useMemo(
    () => fromApi(materials, labour, equipment, tenant.currency),
    [materials, labour, equipment, tenant.currency]
  );
  return {
    rows,
    materials,
    labour,
    equipment,
    currency: tenant.currency,
    loading: loadingMaterials || loadingLabour || loadingEquipment,
    refresh: () => {
      refreshMaterials();
      refreshLabour();
      refreshEquipment();
    }
  };
}

function costCsv(rows: CostRow[]) {
  return toCsv(rows, [
    { key: "code", label: "Code" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category" },
    { key: "type", label: "Type" },
    { key: "unit", label: "Unit" },
    { key: "rate", label: "Rate" },
    { key: "currency", label: "Currency" },
    { key: "source", label: "Source" }
  ]);
}

function roundRate(value: number) {
  return Math.round(value * 100) / 100;
}

async function adjustRateRows({
  slug,
  rows,
  factor,
  materials,
  equipment
}: {
  slug: string;
  rows: CostRow[];
  factor: number;
  materials: Material[];
  equipment: Equipment[];
}) {
  const effectiveDate = new Date().toISOString().slice(0, 10);
  await Promise.all(rows.map((row) => {
    const nextRate = roundRate(row.rate * factor);
    if (row.resource === "materials") {
      return patchRecord(slug, "materials", row.resourceId, {
        cost: nextRate,
        sellingRate: nextRate,
        effectiveDate,
        source: "TENANT"
      });
    }
    if (row.resource === "labour") {
      return patchRecord(slug, "labour", row.resourceId, {
        rate: nextRate,
        effectiveDate
      });
    }
    const item = equipment.find((entry) => entry.id === row.resourceId);
    const currentTotal = item ? item.hireRate + item.transport + item.operatorCost : row.rate;
    const scale = currentTotal > 0 ? nextRate / currentTotal : factor;
    return patchRecord(slug, "equipment", row.resourceId, {
      hireRate: roundRate((item?.hireRate ?? row.rate) * scale),
      transport: roundRate((item?.transport ?? 0) * scale),
      operatorCost: roundRate((item?.operatorCost ?? 0) * scale)
    });
  }));
}

function CostLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-[radial-gradient(circle_at_1px_1px,rgb(203_213_225/.55)_1px,transparent_0)] [background-size:22px_22px] p-6">{children}</div>;
}

function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${active ? "border-accent bg-accent text-white" : "border-hairline bg-surface text-muted hover:text-fg"}`}
    >
      {children}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 pl-10" />
    </label>
  );
}

function RowTable({ rows, onExpand, expanded, loading }: {
  rows: CostRow[]; onExpand?: (id: string) => void; expanded?: string | null; loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-6 shadow-sm">
        <SkeletonText lines={6} />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-surface p-10 text-center shadow-sm">
        <Database className="mx-auto h-6 w-6 text-subtle" />
        <p className="mt-3 font-semibold">Your rate library is empty</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Add the materials, labour and plant you buy, at the prices you actually pay. Estimates
          price from this library, so nothing is assumed on your behalf.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-sunken text-left text-xs text-muted">
          <tr>
            <th className="w-16 px-4 py-3"><span className="flex items-center gap-2"><Star className="h-4 w-4" /><Checkbox /></span></th>
            <th className="px-3 py-3 font-medium">Code</th>
            <th className="px-3 py-3 font-medium">Description</th>
            <th className="px-3 py-3 font-medium">Unit</th>
            <th className="px-3 py-3 font-medium">Rate</th>
            <th className="px-3 py-3 font-medium">Class.</th>
            <th className="w-32 px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr key={row.id} className="border-t border-hairline">
                <td className="px-4 py-3"><span className="flex items-center gap-2"><Star className="h-4 w-4 text-subtle" /><Checkbox /></span></td>
                <td className="px-3 py-3 font-mono text-xs text-muted">{row.code}</td>
                <td className="px-3 py-3">
                  <span className="font-medium">{row.description}</span>
                  <Badge tone={row.type === "Labor" ? "success" : row.type === "Equipment" || row.type === "Operator" ? "warning" : "brand"} className="ml-2 normal-case">{row.category}</Badge>
                </td>
                <td className="px-3 py-3"><span className="rounded-full bg-sunken px-2 py-1 text-xs">{row.unit}</span></td>
                <td className="px-3 py-3 font-semibold">{formatMoney(row.rate, row.currency)}</td>
                <td className="px-3 py-3 text-muted">-</td>
                <td className="px-3 py-3">
                  <span className="flex items-center justify-end gap-2 text-muted">
                    <Plus className="h-4 w-4" />
                    <FileSpreadsheet className="h-4 w-4" />
                    <button type="button" onClick={() => onExpand?.(expanded === row.id ? "" : row.id)} aria-label="Expand row">
                      {expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </span>
                </td>
              </tr>
              {expanded === row.id ? (
                <tr className="border-t border-hairline bg-sunken/40">
                  <td />
                  <td colSpan={6} className="px-3 py-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold">{row.description}</h3>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-success/25 bg-success/10 p-3"><p className="text-xs text-success">Min</p><p className="font-semibold">{formatMoney(row.min, row.currency)}</p></div>
                        <div className="rounded-lg border border-warning/25 bg-warning/10 p-3"><p className="text-xs text-warning">Avg</p><p className="font-semibold">{formatMoney(row.rate, row.currency)}</p></div>
                        <div className="rounded-lg border border-danger/25 bg-danger/10 p-3"><p className="text-xs text-danger">Max</p><p className="font-semibold">{formatMoney(row.max, row.currency)}</p></div>
                      </div>
                      <div className="h-2 rounded-full bg-gradient-to-r from-success via-warning to-danger" />
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-hairline bg-surface p-3"><p className="text-2xs uppercase tracking-widest text-subtle">Type</p><p>{row.type}</p></div>
                        <div className="rounded-lg border border-hairline bg-surface p-3"><p className="text-2xs uppercase tracking-widest text-subtle">Usage</p><p>{row.usage} references</p></div>
                        <div className="rounded-lg border border-hairline bg-surface p-3"><p className="text-2xs uppercase tracking-widest text-subtle">Source</p><p>{row.source}</p></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function filterRows(rows: CostRow[], query: string, type: string, category: string) {
  return rows.filter((row) => {
    const haystack = `${row.code} ${row.description} ${row.category}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (type === "All" || row.type === type) && (category === "All categories" || row.category === category);
  });
}

/** Adds a rate to the company's library. Saved through the API, so it survives a reload. */
function CostItemModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { tenant } = useTenantContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("description") || "").trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await createRecord(tenant.slug, "materials", {
        name,
        category: String(form.get("category") || "").trim() || undefined,
        unit: String(form.get("unit") || "m2"),
        cost: Number(form.get("rate") || 0),
        sellingRate: Number(form.get("rate") || 0)
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as { message?: string }).message ?? "The rate could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add cost item" description={`Added to your rate library in ${tenant.currency}`}>
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Description" required><Input name="description" placeholder="e.g. Ghacem cement 50kg" data-autofocus /></Field>
        <Field label="Category"><Input name="category" placeholder="e.g. Concrete Works" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit"><Select name="unit" defaultValue="m2"><option>m2</option><option>m3</option><option>m</option><option>pcs</option><option>bag</option><option>h</option><option>t</option></Select></Field>
          <Field label={`Rate (${tenant.currency})`}><Input name="rate" type="number" step="0.01" placeholder="0.00" /></Field>
        </div>
        {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Add to library"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function CostDatabasePage() {
  const { rows: baseRows, materials, equipment, loading, refresh } = useCostRows();
  const { tenant } = useTenantContext();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | "escalation" | "advisor" | null>(null);
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(baseRows.map((row) => row.category)))], [baseRows]);
  const rows = filterRows(baseRows, query, "All", category).slice(0, 50);

  async function applyAdjustment(factor: number) {
    await adjustRateRows({ slug: tenant.slug, rows, factor, materials, equipment });
    refresh();
    setNotice(`${rows.length} rate${rows.length === 1 ? "" : "s"} adjusted by ${(factor * 100).toFixed(1)}%.`);
  }

  return (
    <CostLayout>
      {notice ? <p className="mb-4 rounded border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">{notice}</p> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{rows.length} results found</p>
        <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => downloadCsv("cost-database.csv", costCsv(rows))}><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" onClick={() => setModal("escalation")}><TrendingUp className="h-4 w-4" /> Adjust Prices</Button>
          <Button size="sm" onClick={() => setModal("add")}><Plus className="h-4 w-4" /> Add Item</Button>
          <Button size="sm" onClick={() => setModal("advisor")}><Sparkles className="h-4 w-4" /> Ask the Cost Advisor</Button>
        </div>
      </div>
      <div className="mb-6 rounded-lg border border-hairline bg-surface p-3">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2 border-b-2 border-accent px-2 py-2 text-sm"><Database className="h-4 w-4" /> All <span className="text-subtle">{baseRows.length}</span></span>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /> My catalogs</span>
        <span className="text-muted">No catalogs yet. Create one to group your own rates.</span>
        <Button size="sm" onClick={() => setModal("add")}><Plus className="h-4 w-4" /> New catalog</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-hairline bg-surface p-3">
          <h2 className="mb-3 text-sm font-semibold">Categories</h2>
          <Input placeholder="Filter categories..." className="mb-3 h-9" />
          <div className="space-y-1">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${category === item ? "bg-accent text-white" : "text-muted hover:bg-sunken hover:text-fg"}`}>
                <span>{item}</span><span>{item === "All categories" ? baseRows.length : baseRows.filter((row) => row.category === item).length}</span>
              </button>
            ))}
          </div>
        </aside>
        <main className="space-y-4">
          <div className="rounded-lg border border-hairline bg-surface p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_140px]">
              <SearchBar value={query} onChange={setQuery} placeholder="Search by description or code..." />
              <Button onClick={() => setModal("advisor")}><Sparkles className="h-4 w-4" /> AI search</Button>
              <Select><option>All units</option><option>m2</option><option>m3</option><option>pcs</option></Select>
            </div>
          </div>
          <RowTable rows={rows.slice(0, 10)} loading={loading} />
          {rows.length ? <p className="text-center text-sm text-muted">1-{Math.min(10, rows.length)} of {rows.length}</p> : null}
        </main>
      </div>
      <CostItemModal open={modal === "add"} onClose={() => setModal(null)} onSaved={refresh} />
      <EscalationModal open={modal === "escalation"} onClose={() => setModal(null)} rows={rows} onApply={applyAdjustment} />
      <AdvisorModal open={modal === "advisor"} onClose={() => setModal(null)} />
    </CostLayout>
  );
}

function EscalationModal({
  open,
  onClose,
  rows,
  onApply
}: {
  open: boolean;
  onClose: () => void;
  rows: CostRow[];
  onApply: (factor: number) => Promise<void>;
}) {
  const [factor, setFactor] = useState(1.05);
  const [mode, setMode] = useState<"manual" | "index">("manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const affected = rows.length;
  const currentTotal = rows.reduce((sum, row) => sum + row.rate, 0);
  const adjustedTotal = currentTotal * factor;

  async function submit() {
    if (!affected) {
      setError("There are no visible resources to adjust.");
      return;
    }
    if (!Number.isFinite(factor) || factor <= 0) {
      setError("Enter a valid price factor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onApply(factor);
      onClose();
    } catch (e) {
      setError((e as { message?: string }).message ?? "The prices could not be adjusted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adjust Prices" description="Apply a multiplication factor to resource prices">
      <div className="space-y-4">
        <div className="grid grid-cols-2 rounded-lg border border-hairline p-0.5">
          <button className={`rounded-md px-3 py-2 text-sm ${mode === "manual" ? "bg-accent text-white" : ""}`} onClick={() => setMode("manual")}>Manual Factor</button>
          <button className={`rounded-md px-3 py-2 text-sm ${mode === "index" ? "bg-accent text-white" : ""}`} onClick={() => setMode("index")}>From Inflation Index</button>
        </div>
        {mode === "index" ? (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
            <h3 className="font-medium text-warning">Published Construction Cost Indices</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Select defaultValue="Greater Accra">
                {GHANA_REGIONS.map((region) => <option key={region}>{region}</option>)}
              </Select>
              <Select defaultValue="2025" onChange={(event) => setFactor(event.target.value === "2024" ? 1.12 : event.target.value === "2025" ? 1.07 : 1.03)}>
                <option>2024</option><option>2025</option><option>2026</option>
              </Select>
              <Select value={factor.toFixed(2)} onChange={(event) => setFactor(Number(event.target.value))}>
                <option value="1.03">+3%</option>
                <option value="1.07">+7%</option>
                <option value="1.12">+12%</option>
              </Select>
            </div>
          </div>
        ) : null}
        <Field label={mode === "manual" ? "Price Factor" : "Computed Factor"}>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <input type="range" min="0.8" max="1.3" step="0.005" value={factor} onChange={(event) => setFactor(Number(event.target.value))} />
            <Input value={factor.toFixed(4)} onChange={(event) => setFactor(Number(event.target.value) || 1)} />
          </div>
        </Field>
        <div className="rounded-lg border border-hairline bg-sunken p-4 text-sm text-muted">
          <div className="grid gap-2 sm:grid-cols-3">
            <div><p className="label-micro">Resources</p><p className="num text-base font-semibold text-fg">{affected}</p></div>
            <div><p className="label-micro">Current total</p><p className="num text-base font-semibold text-fg">{formatMoney(currentTotal, rows[0]?.currency ?? "GHS")}</p></div>
            <div><p className="label-micro">After adjust</p><p className="num text-base font-semibold text-fg">{formatMoney(adjustedTotal, rows[0]?.currency ?? "GHS")}</p></div>
          </div>
          <p className="mt-2">Example: 100.00 {"->"} {(100 * factor).toFixed(2)}</p>
        </div>
        {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !affected}>
            {busy ? "Applying..." : "Apply"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AdvisorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant } = useTenantContext();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AdvisorAnswer | null>(null);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch(`/api/t/${tenant.slug}/ai/health`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: AiHealth | null) => { if (active) setHealth(data); })
      .catch(() => { if (active) setHealth(null); });
    return () => { active = false; };
  }, [open, tenant.slug]);

  async function ask(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setQuestion(trimmed);
    try {
      const result = await postJson<AdvisorAnswer>(`/api/t/${tenant.slug}/ai`, { question: trimmed });
      setAnswer(result);
    } catch (e) {
      setError((e as { message?: string }).message ?? "The advisor could not answer this question.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask();
  }

  return (
    <Modal open={open} onClose={onClose} title="Cost Advisor" description="Ask questions against the active cost database">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-sunken px-3 py-2 text-sm">
          <span className="text-muted">Answers use your active materials, labour, equipment and finance records.</span>
          <Badge tone={health?.configured ? "success" : "neutral"}>
            {health?.configured ? `OpenAI · ${health.model}` : "Deterministic fallback"}
          </Badge>
        </div>

        {answer ? (
          <div className="rounded-lg border border-hairline bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{answer.headline}</h3>
                <p className="mt-1 text-sm text-muted">{answer.detail}</p>
              </div>
              <Badge tone="brand">{answer.source}</Badge>
            </div>
            {answer.rows.length ? (
              <div className="mt-4 divide-y divide-hairline rounded-lg border border-hairline">
                {answer.rows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-3 text-xs text-muted">Provider: {answer.provider}</p>
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <Sparkles className="mb-3 h-10 w-10 rounded-xl bg-accent/10 p-2 text-accent" />
            <h3 className="text-lg font-semibold">Ask me anything about construction costs</h3>
            <p className="mt-2 max-w-lg text-sm text-muted">Use this while estimating: typical rates, regional differences, material alternatives, stale rates, cash movement, and budget risks.</p>
          </div>
        )}

        {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          {["Average cost per m2 of plaster", "Compare concrete prices by region", "Typical labor rates for electricians"].map((text) => (
            <Button key={text} type="button" size="sm" onClick={() => void ask(text)} disabled={busy}>{text}</Button>
          ))}
        </div>

        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={submit}>
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about costs, materials, pricing..." />
          <Button type="submit" variant="primary" disabled={busy || !question.trim()}>
            <Sparkles className="h-4 w-4" /> {busy ? "Asking..." : "Ask"}
          </Button>
        </form>
      </div>
    </Modal>
  );
}

export function ResourceCatalogPage() {
  const { rows: baseRows, materials, equipment, loading, refresh } = useCostRows();
  const { tenant } = useTenantContext();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [category, setCategory] = useState("All categories");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | "adjust" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = filterRows(baseRows, query, type, category);
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(baseRows.map((row) => row.category)))], [baseRows]);
  const count = (candidate: string) => filterRows(baseRows, query, candidate, category).length;

  async function applyAdjustment(factor: number) {
    await adjustRateRows({ slug: tenant.slug, rows, factor, materials, equipment });
    refresh();
    setNotice(`${rows.length} resource${rows.length === 1 ? "" : "s"} adjusted by ${(factor * 100).toFixed(1)}%.`);
  }

  return (
    <CostLayout>
      {notice ? <p className="mb-4 rounded border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">{notice}</p> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{rows.length} resources found</p>
        <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => setModal("adjust")}><TrendingUp className="h-4 w-4" /> Adjust Prices</Button>
          <Button size="sm" onClick={() => setModal("add")}><Plus className="h-4 w-4" /> Add Resource</Button>
          <Button size="sm" variant="primary"><Upload className="h-4 w-4" /> Import region</Button>
        </div>
      </div>
      <div className="mb-5 rounded-lg border border-hairline bg-surface p-3">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2 border-b-2 border-accent px-2 py-2"><Database className="h-4 w-4" /> All databases <span className="text-subtle">{baseRows.length}</span></span>
          <span className="inline-flex items-center gap-2 px-2 py-2 text-muted"><Home className="h-4 w-4" /> My Catalog <span>0</span></span>
          <span className="inline-flex items-center gap-2 px-2 py-2 text-muted"><Plus className="h-4 w-4" /> Import</span>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {["All", "Material", "Equipment", "Labor", "Operator"].map((item) => (
          <Chip key={item} active={type === item} onClick={() => setType(item)}>{item === "Material" ? "Materials" : item === "Labor" ? "Labor" : item} <span>{count(item)}</span></Chip>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-hairline bg-surface p-3">
          <h2 className="mb-3 text-sm font-semibold">Categories</h2>
          <div className="space-y-1">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${category === item ? "bg-sunken text-fg" : "text-muted hover:bg-sunken hover:text-fg"}`}>
                <span>{item}</span><span>{item === "All categories" ? baseRows.length : baseRows.filter((row) => row.category === item).length}</span>
              </button>
            ))}
          </div>
        </aside>
        <main className="space-y-4">
          <div className="rounded-lg border border-hairline bg-surface p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_140px]">
              <SearchBar value={query} onChange={setQuery} placeholder="Search by name or code..." />
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</Select>
              <Select><option>All units</option><option>m2</option><option>m3</option><option>h</option></Select>
            </div>
          </div>
          <ResourceTable rows={rows.slice(0, 12)} expanded={expanded} onExpand={setExpanded} loading={loading} />
          <p className="text-center text-sm text-muted">1-{Math.min(12, rows.length)} of {rows.length}</p>
        </main>
      </div>
      <CostItemModal open={modal === "add"} onClose={() => setModal(null)} onSaved={refresh} />
      <EscalationModal open={modal === "adjust"} onClose={() => setModal(null)} rows={rows} onApply={applyAdjustment} />
    </CostLayout>
  );
}

function ResourceTable({ rows, expanded, onExpand, loading }: {
  rows: CostRow[]; expanded: string | null; onExpand: (id: string | null) => void; loading?: boolean;
}) {
  if (loading || !rows.length) {
    return <RowTable rows={rows} loading={loading} />;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-sunken text-left text-xs text-muted">
          <tr>
            <th className="w-12 px-4 py-3"><Checkbox /></th>
            <th className="px-3 py-3 font-medium">Name</th>
            <th className="px-3 py-3 font-medium">Code</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 font-medium">Unit</th>
            <th className="px-3 py-3 font-medium">Price (avg)</th>
            <th className="px-3 py-3 font-medium">Price Range</th>
            <th className="px-3 py-3 font-medium">Usage</th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr key={row.id} className="border-t border-hairline">
                <td className="px-4 py-3"><Checkbox /></td>
                <td className="px-3 py-3 font-medium">{row.description}</td>
                <td className="px-3 py-3 font-mono text-xs text-muted">{row.code}</td>
                <td className="px-3 py-3"><Badge tone={row.type === "Labor" || row.type === "Operator" ? "success" : row.type === "Equipment" ? "warning" : "brand"} className="normal-case">{row.category}</Badge></td>
                <td className="px-3 py-3">{row.unit}</td>
                <td className="px-3 py-3 font-semibold">{formatNumber(row.rate)}</td>
                <td className="px-3 py-3">
                  <span className="inline-grid grid-cols-[44px_90px_44px] items-center gap-2 text-xs text-muted">
                    <span>{formatNumber(row.min)}</span><span className="h-2 rounded-full bg-gradient-to-r from-success via-warning to-warning" /><span>{formatNumber(row.max)}</span>
                  </span>
                </td>
                <td className="px-3 py-3"><span className="rounded-full bg-sunken px-2 py-1">{row.usage}</span></td>
                <td className="px-3 py-3">
                  <span className="flex justify-end gap-2 text-muted">
                    <FileSpreadsheet className="h-4 w-4" />
                    <button onClick={() => onExpand(expanded === row.id ? null : row.id)}>{expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
                  </span>
                </td>
              </tr>
              {expanded === row.id ? (
                <tr className="border-t border-hairline bg-sunken/40">
                  <td />
                  <td colSpan={8} className="px-3 py-4">
                    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                      <div>
                        <h3 className="font-semibold">{row.description}</h3>
                        <p className="font-mono text-xs text-muted">{row.code} · {row.unit}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-success/10 p-3 text-success">Min<br /><b>{formatNumber(row.min)}</b></div>
                          <div className="rounded-lg bg-warning/10 p-3 text-warning">Avg<br /><b>{formatNumber(row.rate)}</b></div>
                          <div className="rounded-lg bg-danger/10 p-3 text-danger">Max<br /><b>{formatNumber(row.max)}</b></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="mt-10 h-2 rounded-full bg-gradient-to-r from-success via-warning to-danger" />
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-hairline bg-surface p-3"><p className="text-2xs uppercase text-subtle">Type</p>{row.type}</div>
                          <div className="rounded-lg border border-hairline bg-surface p-3"><p className="text-2xs uppercase text-subtle">Usage</p>{row.usage} references</div>
                          <div className="rounded-lg border border-hairline bg-surface p-3"><p className="text-2xs uppercase text-subtle">Region</p>{row.source}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: typeof Database }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <p className="flex items-center gap-2 text-xs text-muted"><Icon className="h-4 w-4" /> {label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

const BENCHMARKS = [
  { type: "Office Building", min: 1800, q1: 2200, median: 2650, q3: 3200, max: 4500 },
  { type: "Hospital", min: 3200, q1: 4100, median: 4500, q3: 5300, max: 6800 },
  { type: "School / University", min: 1900, q1: 2400, median: 2850, q3: 3600, max: 4600 },
  { type: "Single Family House", min: 1450, q1: 1900, median: 2400, q3: 3100, max: 4200 },
  { type: "Warehouse / Logistics", min: 650, q1: 800, median: 950, q3: 1300, max: 1900 }
];

export function CostBenchmarksPage() {
  const [buildingType, setBuildingType] = useState("Office Building");
  const [area, setArea] = useState(5000);
  const [totalCost, setTotalCost] = useState(13250000);
  const benchmark = BENCHMARKS.find((item) => item.type === buildingType) ?? BENCHMARKS[0];
  const costPerM2 = totalCost / Math.max(area, 1);
  const percentile = costPerM2 <= benchmark.q1 ? "P25" : costPerM2 <= benchmark.median ? "P50" : costPerM2 <= benchmark.q3 ? "P75" : "P90";
  const marker = Math.min(100, Math.max(0, ((costPerM2 - benchmark.min) / (benchmark.max - benchmark.min)) * 100));

  return (
    <CostLayout>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-10 w-10 rounded-xl bg-accent/10 p-2 text-accent" />
          <div><h1 className="text-2xl font-semibold tracking-tight">Cost Benchmarks</h1><p className="text-sm text-muted">Compare your estimate against industry benchmarks</p></div>
        </div>
              </div>
      <section className="mb-5 rounded-lg border border-hairline bg-surface p-4 text-sm text-muted">
        <p><b className="text-fg">Source:</b> German building-cost benchmark (2024), Germany, EUR</p>
        <p className="mt-2">These are planning benchmarks compiled from named public sources, not a live feed. Actual costs vary by location, specification and market.</p>
      </section>
      <section className="mb-5 rounded-lg border border-hairline bg-surface p-4">
        <h2 className="mb-3 font-semibold">Compare a project</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Building Type"><Select value={buildingType} onChange={(event) => setBuildingType(event.target.value)}>{BENCHMARKS.map((item) => <option key={item.type}>{item.type}</option>)}</Select></Field>
          <Field label="Region"><Select><option>Germany (EUR)</option><option>Canada (CAD)</option></Select></Field>
          <Field label="Gross Floor Area (m2)"><Input type="number" value={area} onChange={(event) => setArea(Number(event.target.value) || 0)} /></Field>
          <Field label="Your Total Cost (EUR)"><Input type="number" value={totalCost} onChange={(event) => setTotalCost(Number(event.target.value) || 0)} /></Field>
        </div>
      </section>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Stat label="Your Cost / m2" value={formatMoney(costPerM2, "EUR")} icon={BarChart3} />
        <Stat label="Percentile vs Industry" value={<span className="text-success">{percentile}</span>} icon={TrendingUp} />
        <Stat label="Percentile vs Portfolio" value={<span className="text-muted">-</span>} icon={BarChart3} />
        <Stat label="Difference from Median" value={<span className={costPerM2 > benchmark.median ? "text-danger" : "text-success"}>{formatMoney(costPerM2 - benchmark.median, "EUR")}</span>} icon={ArrowUpRight} />
      </div>
      <section className="mb-5 rounded-lg border border-hairline bg-surface p-5">
        <h2 className="mb-4 font-semibold">{buildingType}, Germany (German building-cost benchmark 2024)</h2>
        <div className="relative mb-4 h-8 overflow-visible rounded-full bg-gradient-to-r from-success via-warning to-danger">
          <span className="absolute -top-7 rounded bg-fg px-2 py-1 text-xs text-surface" style={{ left: `${marker}%`, transform: "translateX(-50%)" }}>{formatMoney(costPerM2, "EUR")}</span>
          <span className="absolute -bottom-2 h-5 w-1 bg-fg" style={{ left: `${marker}%` }} />
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          <Band label="Min" value={benchmark.min} />
          <Band label="Q1 (25th)" value={benchmark.q1} />
          <Band label="Median" value={benchmark.median} active />
          <Band label="Q3 (75th)" value={benchmark.q3} />
          <Band label="Max" value={benchmark.max} />
        </div>
      </section>
      <section className="mb-5 rounded-lg border border-hairline bg-surface p-5">
        <h2 className="mb-3 font-semibold">Cost group split of your cost / m2</h2>
        <div className="mb-3 flex h-8 overflow-hidden rounded-md"><div className="bg-brand-500 text-center text-xs font-semibold leading-8 text-white" style={{ width: "72%" }}>72%</div><div className="bg-warning text-center text-xs font-semibold leading-8 text-white" style={{ width: "28%" }}>28%</div></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Breakdown title="KG300 Construction" amount={costPerM2 * 0.72} color="bg-brand-500" />
          <Breakdown title="KG400 Technical" amount={costPerM2 * 0.28} color="bg-warning" />
        </div>
      </section>
      <section className="rounded-lg border border-hairline bg-surface p-5">
        <h2 className="mb-4 font-semibold">All Building Types, Germany</h2>
        <div className="space-y-4">
          {BENCHMARKS.map((item) => (
            <div key={item.type} className="grid grid-cols-[180px_1fr_90px] items-center gap-4 text-sm">
              <span>{item.type}</span>
              <span className="relative h-4 rounded-full bg-sunken"><span className="absolute left-[18%] top-0 h-4 rounded-full bg-brand-200" style={{ width: "34%" }} /><span className="absolute top-0 h-4 w-0.5 bg-accent" style={{ left: `${((item.median - item.min) / (item.max - item.min)) * 100}%` }} /></span>
              <span className="text-right text-muted">{formatMoney(item.median, "EUR")}</span>
            </div>
          ))}
        </div>
      </section>
    </CostLayout>
  );
}

function Band({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return <div className={`rounded-lg border p-3 ${active ? "border-accent bg-accent/10" : "border-transparent bg-sunken"}`}><p className="text-xs text-muted">{label}</p><p className="font-semibold">{formatMoney(value, "EUR")}</p></div>;
}

function Breakdown({ title, amount, color }: { title: string; amount: number; color: string }) {
  const groups = ["Exterior walls & facade", "Floors, ceilings & slabs", "Interior walls & partitions", "Foundations & substructure", "Roofs"];
  return (
    <div className="rounded-lg bg-sunken p-4">
      <div className="mb-3 flex justify-between"><span>{title}</span><b>{formatMoney(amount, "EUR")}/m2</b></div>
      <div className="space-y-2">
        {groups.map((group, index) => (
          <div key={group} className="grid grid-cols-[180px_1fr_50px] items-center gap-2 text-sm text-muted">
            <span>{group}</span><span className="h-2 rounded-full bg-surface"><span className={`block h-2 rounded-full ${color}`} style={{ width: `${60 - index * 9}%` }} /></span><span>{18 - index * 3}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
