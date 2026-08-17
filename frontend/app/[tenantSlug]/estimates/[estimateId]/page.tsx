"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clipboard, Copy, Database, Download,
  FileText, History, Layers, Lock, Percent, Plus, RotateCw, Save, Settings2, ShieldCheck,
  Sparkles, Trash2, Upload, WandSparkles, X
} from "lucide-react";
import { PageHeader } from "../../../../components/app/PageHeader";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { activeTaxRates, useSettings } from "../../../../components/app/useSettings";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { Button, ButtonLink, IconButton } from "../../../../components/ui/Button";
import { StatusBadge } from "../../../../components/ui/Badge";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../../../../components/ui/Menu";
import { Modal } from "../../../../components/ui/Overlay";
import { Field, Input, Select } from "../../../../components/ui/Field";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { ErrorState } from "../../../../components/ui/EmptyState";
import { createRecord, deleteRecord, patchRecord, postJson, useList, useRecord } from "../../../../lib/client";
import { estimateTotals, lineCost, lineTotal, reviewEstimate, adjustedQuantity } from "../../../../lib/calc";
import { formatMoney, formatNumber, formatPercent, daysBetween } from "../../../../lib/format";
import { tenantPath } from "../../../../lib/tenant";
import { CONSTRUCTION_CATEGORIES, UNITS } from "../../../../lib/regions";
import type { Estimate, EstimateItem, EstimateItemKind, Material } from "../../../../lib/types";

const KINDS: EstimateItemKind[] = ["MATERIAL", "LABOUR", "EQUIPMENT", "SUBCONTRACTOR"];
type ReviewIssue = { id: string; severity: "high" | "medium" | "low"; title: string; detail: string };
type AiReviewResponse = { issues: ReviewIssue[]; provider: string };

export default function EstimateBuilderPage() {
  const { estimateId } = useParams<{ estimateId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenantContext();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const currency = tenant.currency;

  const { data, loading, error, refresh } = useRecord<Estimate>("estimates", estimateId);
  const { rows: materials } = useList<Material>("materials", { size: 200 });
  const { data: settings } = useSettings();

  const [draft, setDraft] = useState<Estimate | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [aiIssues, setAiIssues] = useState<ReviewIssue[] | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState<"csv" | "paste" | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [compactGrid, setCompactGrid] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (data) setDraft(structuredClone(data)); }, [data]);
  useEffect(() => { if (searchParams.get("action") === "quote") setPreviewOpen(true); }, [searchParams]);

  const totals = useMemo(() => (draft ? estimateTotals(draft) : null), [draft]);
  const taxRates = useMemo(() => activeTaxRates(settings), [settings]);
  const materialAges = useMemo(() => {
    const ages: Record<string, number> = {};
    if (!draft) return ages;
    for (const section of draft.sections) {
      for (const item of section.items) {
        const match = materials.find((m) => m.name === item.description);
        if (match) ages[match.name] = daysBetween(match.updatedAt);
      }
    }
    return ages;
  }, [draft, materials]);
  const localIssues = useMemo(() => (draft ? reviewEstimate(draft, materialAges) : []), [draft, materialAges]);
  const issues = useMemo(() => {
    const combined = [...localIssues];
    for (const issue of aiIssues ?? []) {
      if (!combined.some((existing) => existing.id === issue.id)) combined.push(issue);
    }
    return combined.filter((i) => !ignored.includes(i.id));
  }, [localIssues, aiIssues, ignored]);
  const flatItems = useMemo(
    () => draft?.sections.flatMap((section) => section.items.map((item) => ({ section, item }))) ?? [],
    [draft]
  );
  const selectedFlatItems = flatItems.filter(({ item }) => selectedItems.includes(item.id));
  const allSelected = flatItems.length > 0 && selectedItems.length === flatItems.length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (loading || !draft) {
    return <Card className="p-6"><SkeletonText lines={8} /></Card>;
  }
  if (error) {
    return <Card><ErrorState title="We couldn't load this estimate." message={error.message} onRetry={refresh} /></Card>;
  }

  const update = (mutate: (e: Estimate) => void) => {
    if (locked) {
      setToast("Unlock this estimate before editing.");
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      mutate(next);
      return next;
    });
    setDirty(true);
  };

  const updateItem = (sectionId: string, itemId: string, patch: Partial<EstimateItem>) =>
    update((e) => {
      const section = e.sections.find((s) => s.id === sectionId);
      const item = section?.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, patch);
    });

  const addItem = (sectionId: string, seed?: Partial<EstimateItem>) =>
    update((e) => {
      let section = e.sections.find((s) => s.id === sectionId);
      if (!section) {
        section = { id: `SEC-${Date.now()}`, name: "New section", items: [] };
        e.sections.push(section);
      }
      section.items.push({
        id: `ITM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: seed?.description ?? "",
        category: seed?.category ?? section.name,
        kind: seed?.kind ?? "MATERIAL",
        quantity: seed?.quantity ?? 1,
        unit: seed?.unit ?? "item",
        rate: seed?.rate ?? 0,
        waste: seed?.waste ?? 0,
        markup: seed?.markup ?? 15
      });
    });

  function estimateRequest(source: Estimate) {
    return {
      title: source.title,
      projectId: source.projectId || undefined,
      clientId: source.clientId || undefined,
      estimator: source.estimator || undefined,
      currency,
      overheadPct: source.overheadPct,
      contingencyPct: source.contingencyPct,
      profitPct: source.profitPct,
      taxPct: source.taxPct,
      discount: source.discount,
      status: source.status,
      sections: source.sections
    };
  }

  async function persistDraft(message = "Estimate saved.") {
    if (!draft) return null;
    setSaving(true);
    try {
      const saved = await patchRecord<Estimate>(tenant.slug, "estimates", draft.id, estimateRequest(draft));
      setDraft(structuredClone(saved));
      setDirty(false);
      refresh();
      setToast(message);
      return saved;
    } catch (e) {
      setToast((e as { message?: string }).message ?? "The estimate could not be saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    await persistDraft();
  }

  function toggleSelected(itemId: string) {
    setSelectedItems((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  }

  function clearSelection() {
    setSelectedItems([]);
  }

  function deleteSelected() {
    if (!selectedItems.length) return;
    update((e) => {
      e.sections.forEach((section) => {
        section.items = section.items.filter((item) => !selectedItems.includes(item.id));
      });
    });
    setToast(`${selectedItems.length} position${selectedItems.length === 1 ? "" : "s"} deleted.`);
    clearSelection();
  }

  function changeSelectedUnit(unit: string) {
    if (!selectedItems.length) return;
    update((e) => {
      e.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (selectedItems.includes(item.id)) item.unit = unit;
        });
      });
    });
    setToast(`Unit changed to ${unit} for ${selectedItems.length} position${selectedItems.length === 1 ? "" : "s"}.`);
  }

  function updateRatesFromPriceBook() {
    let changed = 0;
    update((e) => {
      e.sections.forEach((section) => {
        section.items.forEach((item) => {
          const material = materials.find((m) => m.name === item.description);
          if (material && material.cost !== item.rate) {
            item.rate = material.cost;
            changed += 1;
          }
        });
      });
    });
    setToast(changed ? `${changed} rate${changed === 1 ? "" : "s"} updated from the rate library.` : "All matched rates are current.");
  }

  async function duplicateEstimate(titleSuffix = " copy") {
    if (!draft) return;
    setSaving(true);
    try {
      const copy = await createRecord<Estimate>(tenant.slug, "estimates", {
        ...estimateRequest(draft),
        title: `${draft.title}${titleSuffix}`,
        status: "DRAFT"
      });
      setToast("Estimate copy created.");
      router.push(path(`/estimates/${copy.id}`));
    } catch (e) {
      setToast((e as { message?: string }).message ?? "The estimate could not be duplicated.");
    } finally {
      setSaving(false);
    }
  }

  async function createRevision() {
    await duplicateEstimate(" revision");
  }

  async function removeEstimate() {
    if (!draft || !window.confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteRecord(tenant.slug, "estimates", draft.id);
      router.push(path("/estimates"));
    } catch (e) {
      setToast((e as { message?: string }).message ?? "The estimate could not be deleted.");
      setSaving(false);
    }
  }

  async function setEstimateStatus(status: Estimate["status"]) {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await patchRecord<Estimate>(tenant.slug, "estimates", draft.id, {
        ...estimateRequest(draft),
        status
      });
      setDraft(structuredClone(saved));
      setDirty(false);
      refresh();
      setToast(`Estimate marked ${status.toLowerCase()}.`);
    } catch (e) {
      setToast((e as { message?: string }).message ?? "The status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  function exportEstimateCsv() {
    const header = "Section,Description,Type,Quantity,Unit,Rate,Waste,Cost,Markup,Total";
    const body = flatItems.map(({ section, item }) => [
      section.name,
      item.description,
      item.kind,
      item.quantity,
      item.unit,
      item.rate,
      item.waste,
      lineCost(item),
      item.markup,
      lineTotal(item)
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft?.id ?? "estimate"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Estimate exported to CSV.");
  }

  async function createQuote() {
    if (!draft || !totals) return;
    setSaving(true);
    try {
      const source = dirty ? await persistDraft("Estimate saved before creating the quotation.") : draft;
      if (!source) return;
      const quote = await createRecord<{ id: string }>(tenant.slug, "quotations", {
        estimateId: source.id,
        projectId: source.projectId,
        clientId: source.clientId,
        owner: source.estimator,
        expiry: new Date(Date.now() + 30 * 86_400_000).toISOString()
      });
      await patchRecord(tenant.slug, "estimates", source.id, { status: "QUOTED" });
      router.push(path(`/quotations/${quote.id}`));
    } catch (e) {
      setToast((e as { message?: string }).message ?? "The quotation could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function runAiReview(openPanel = true) {
    if (!draft || !totals) return;
    setReviewing(true);
    if (openPanel) setReviewOpen(true);
    try {
      const result = await postJson<AiReviewResponse>(`/api/t/${tenant.slug}/ai/review`, {
        lines: flatItems.map(({ item }) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          cost_type: item.kind,
          waste_percent: item.waste,
          rate_age_days: materialAges[item.description] ?? null
        })),
        gross_margin_percent: totals.grossMargin,
        contingency_percent: draft.contingencyPct
      });
      setAiIssues(result.issues);
      setAiProvider(result.provider);
      setToast(`${result.issues.length} AI review issue${result.issues.length === 1 ? "" : "s"} returned.`);
    } catch (e) {
      setToast((e as { message?: string }).message ?? "AI review could not run.");
    } finally {
      setReviewing(false);
    }
  }

  function importRows(rows: EstimateItem[], sectionName = "Imported items") {
    if (!rows.length) {
      setToast("No valid rows were found. Use description, quantity, unit and rate columns.");
      return;
    }
    update((e) => {
      let section = e.sections.find((entry) => entry.name.toLowerCase() === sectionName.toLowerCase());
      if (!section) {
        section = { id: `SEC-${Date.now()}`, name: sectionName, items: [] };
        e.sections.push(section);
      }
      section.items.push(...rows);
    });
    setToast(`${rows.length} imported line${rows.length === 1 ? "" : "s"} added.`);
    setImportOpen(null);
  }

  function parseEstimateRows(text: string): EstimateItem[] {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const split = (line: string) => line.includes("\t") ? line.split("\t") : line.split(",");
    const first = split(lines[0]).map((cell) => cell.trim().toLowerCase());
    const hasHeader = first.some((cell) => ["description", "qty", "quantity", "unit", "rate", "kind", "type", "waste", "markup"].includes(cell));
    const header = hasHeader ? first : [];
    const body = hasHeader ? lines.slice(1) : lines;
    const at = (cells: string[], names: string[], fallback: number) => {
      const index = names.map((name) => header.indexOf(name)).find((i) => i >= 0);
      return cells[index ?? fallback] ?? "";
    };
    return body.map((line, index) => {
      const cells = split(line).map((cell) => cell.trim().replace(/^"|"$/g, ""));
      const description = at(cells, ["description", "item", "name"], 0);
      const quantity = Number(at(cells, ["quantity", "qty"], 1) || 0);
      const unit = at(cells, ["unit"], 2) || "item";
      const rate = Number(at(cells, ["rate", "unit rate", "price"], 3) || 0);
      const rawKind = at(cells, ["kind", "type", "cost_type"], 4).toUpperCase();
      const kind = KINDS.includes(rawKind as EstimateItemKind) ? rawKind as EstimateItemKind : "MATERIAL";
      const waste = Number(at(cells, ["waste", "waste_percent"], 5) || 0);
      const markup = Number(at(cells, ["markup", "markup_percent"], 6) || 15);
      if (!description || !Number.isFinite(quantity)) return null;
      return {
        id: `ITM-${Date.now()}-${index}`,
        description,
        category: "Imported",
        kind,
        quantity,
        unit,
        rate: Number.isFinite(rate) ? rate : 0,
        waste: Number.isFinite(waste) ? waste : 0,
        markup: Number.isFinite(markup) ? markup : 15
      };
    }).filter(Boolean) as EstimateItem[];
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    importRows(parseEstimateRows(await file.text()), file.name.replace(/\.[^.]+$/, "") || "Imported items");
    event.target.value = "";
  }

  // An estimate can be started before it has a client or a named estimator, so each half of this
  // line stands on its own instead of printing "null".
  const subtitle = [draft.clientName, draft.estimator ? `prepared by ${draft.estimator}` : null]
    .filter(Boolean).join(" · ") || "Not yet linked to a client";

  return (
    <>
      <PageHeader
        title={draft.title}
        meta={<><span className="num text-sm text-muted">{draft.reference}</span><StatusBadge status={draft.status} />{dirty ? <span className="text-xs text-warning">Unsaved changes</span> : null}</>}
        description={subtitle}
        actions={
          <>
            <Button onClick={() => setBulkOpen(true)}><Percent className="h-3.5 w-3.5" /> Bulk edit</Button>
            <Button onClick={() => setPreviewOpen(true)}><FileText className="h-4 w-4" /> Preview</Button>
            <Button variant="ai" onClick={() => void runAiReview(true)} disabled={reviewing}>
              <Sparkles className="h-3.5 w-3.5" /> {reviewing ? "Reviewing…" : "Review with AI"}
              {issues.length ? <span className="num ml-1 rounded bg-laterite-500/20 px-1 text-2xs">{issues.length}</span> : null}
            </Button>
            <Button onClick={save} disabled={!dirty || saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</Button>
            <Button variant="primary" onClick={createQuote}>Create quote</Button>
            <Menu
              trigger={({ toggle }) => <Button onClick={toggle} aria-label="More actions">More</Button>}
            >
              {(close) => (
                <>
                  <MenuLabel>Estimate</MenuLabel>
                  <MenuItem icon={Copy} onClick={() => { close(); void duplicateEstimate(); }}>Duplicate estimate</MenuItem>
                  <MenuItem onClick={() => { close(); void setEstimateStatus("READY"); }}>Mark as ready</MenuItem>
                  <MenuItem onClick={() => { close(); void setEstimateStatus("ARCHIVED"); }}>Archive</MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={() => { close(); update((e) => e.sections.push({ id: `SEC-${Date.now()}`, name: "New section", items: [] })); }} icon={Plus}>Add section</MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={Trash2} danger onClick={() => { close(); void removeEstimate(); }}>Delete estimate</MenuItem>
                </>
              )}
            </Menu>
          </>
        }
      />

      <Card className="mb-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2">
          <div className="mr-2 flex items-center gap-2 rounded-lg bg-success/10 px-2.5 py-1.5 text-success">
            <span className="num flex h-8 w-8 items-center justify-center rounded-full border border-success/25 bg-surface text-sm font-semibold">
              {Math.max(1, 100 - issues.length * 9)}
            </span>
            <span>
              <span className="block text-xs font-semibold">Quality</span>
              <span className="block text-2xs uppercase tracking-wider">{issues.length ? `${issues.length} warnings` : "Great"}</span>
            </span>
          </div>
          <Button size="sm" onClick={() => setLocked((value) => !value)}>
            <Lock className="h-3.5 w-3.5" /> {locked ? "Unlock estimate" : "Lock estimate"}
          </Button>
          <Button size="sm" onClick={createRevision}><History className="h-3.5 w-3.5" /> Create revision</Button>
          <span className="mx-1 h-6 w-px bg-hairline" aria-hidden />
          <Button size="sm" variant="primary" onClick={() => addItem(draft.sections[0]?.id ?? "")}><Plus className="h-3.5 w-3.5" /> Add position</Button>
          <Button size="sm" onClick={() => update((e) => e.sections.push({ id: `SEC-${Date.now()}`, name: "New section", items: [] }))}>
            <Layers className="h-3.5 w-3.5" /> Add section
          </Button>
          <Button size="sm" onClick={() => setPickerFor(draft.sections[0]?.id ?? null)}><Database className="h-3.5 w-3.5" /> From database</Button>
          <Button size="sm" onClick={() => setImportOpen("csv")}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setImportOpen("paste")}>
            <Clipboard className="h-3.5 w-3.5" /> Paste
          </Button>
          <Button size="sm" onClick={exportEstimateCsv}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Menu
            width="w-56"
            trigger={({ toggle }) => <Button size="sm" onClick={toggle}><Settings2 className="h-3.5 w-3.5" /> Grid settings</Button>}
          >
            {(close) => (
              <>
                <MenuLabel>Grid density</MenuLabel>
                <MenuItem onClick={() => { setCompactGrid(false); close(); }}>Comfortable rows</MenuItem>
                <MenuItem onClick={() => { setCompactGrid(true); close(); }}>Compact rows</MenuItem>
              </>
            )}
          </Menu>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="label-micro mr-1">Quality</span>
          <Button size="sm" onClick={() => { setReviewOpen(true); setToast("Validation finished."); }}>
            <ShieldCheck className="h-3.5 w-3.5" /> Validate
          </Button>
          <Button size="sm" onClick={updateRatesFromPriceBook}><RotateCw className="h-3.5 w-3.5" /> Update rates</Button>
          <Button size="sm" onClick={() => { setReviewOpen(true); setToast(`${issues.length} price and completeness warning${issues.length === 1 ? "" : "s"} found.`); }}>
            <AlertTriangle className="h-3.5 w-3.5" /> Price check
          </Button>
          <Button size="sm" variant="ai" onClick={() => void runAiReview(true)} disabled={reviewing}><WandSparkles className="h-3.5 w-3.5" /> AI</Button>
          <Button size="sm" variant="ai" onClick={() => setPickerFor(draft.sections[0]?.id ?? null)}>Cost finder</Button>
          <Button size="sm" variant="ai" onClick={() => void runAiReview(true)} disabled={reviewing}><Sparkles className="h-3.5 w-3.5" /> Smart AI</Button>
          <span className="num ml-auto text-xs text-muted">{draft.sections.length} sections · {flatItems.length} positions · grand total {formatMoney(totals?.total, currency, 0)}</span>
        </div>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          {draft.sections.map((section) => {
            const isCollapsed = collapsed.includes(section.id);
            const sectionCost = section.items.reduce((s, i) => s + lineCost(i), 0);
            const sectionTotal = section.items.reduce((s, i) => s + lineTotal(i), 0);
            return (
              <Card key={section.id} className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-hairline bg-sunken/60 px-3 py-2">
                  <IconButton
                    label={isCollapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
                    onClick={() => setCollapsed((c) => (isCollapsed ? c.filter((x) => x !== section.id) : [...c, section.id]))}
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </IconButton>
                  <input
                    value={section.name}
                    onChange={(e) => update((d) => { const s = d.sections.find((x) => x.id === section.id); if (s) s.name = e.target.value; })}
                    aria-label="Section name"
                    className="w-56 border-0 bg-transparent text-2xs font-semibold uppercase tracking-wider text-fg outline-none focus:ring-0"
                  />
                  <span className="num ml-auto flex items-center gap-4 text-xs text-muted">
                    <span>{section.items.length} items</span>
                    <span>Cost {formatMoney(sectionCost, currency, 0)}</span>
                    <span className="font-medium text-fg">Total {formatMoney(sectionTotal, currency, 0)}</span>
                  </span>
                  <IconButton label={`Delete ${section.name}`} onClick={() => update((d) => { d.sections = d.sections.filter((s) => s.id !== section.id); })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>

                {!isCollapsed ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th scope="col" className="w-10 px-2 py-1.5 text-left">
                            <input
                              type="checkbox"
                              aria-label={`Select all positions in ${section.name}`}
                              checked={section.items.length > 0 && section.items.every((item) => selectedItems.includes(item.id))}
                              onChange={(event) => {
                                const ids = section.items.map((item) => item.id);
                                setSelectedItems((current) => event.target.checked
                                  ? Array.from(new Set([...current, ...ids]))
                                  : current.filter((id) => !ids.includes(id))
                                );
                              }}
                              className="h-4 w-4 rounded border-hairline"
                            />
                          </th>
                          {[
                            ["Description", "left"], ["Type", "left"], ["Qty", "right"], ["Unit", "left"],
                            ["Rate", "right"], ["Waste", "right"], ["Cost", "right"], ["Markup", "right"],
                            ["Total", "right"], ["", "right"]
                          ].map(([label, align], i) => (
                            <th key={i} scope="col" className={`px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted ${align === "right" ? "text-right" : "text-left"}`}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item) => {
                          const stale = materialAges[item.description] > 60;
                          const selected = selectedItems.includes(item.id);
                          return (
                            <tr key={item.id} className={`border-b border-hairline last:border-0 hover:bg-sunken/40 ${selected ? "bg-accent/5" : ""} ${compactGrid ? "text-xs" : ""}`}>
                              <td className="px-2 py-1">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${item.description || item.id}`}
                                  checked={selected}
                                  onChange={() => toggleSelected(item.id)}
                                  className="h-4 w-4 rounded border-hairline"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  value={item.description}
                                  onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                                  aria-label="Description"
                                  placeholder="Describe the work or material"
                                  className="w-full min-w-[220px] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-hairline focus:border-accent focus:bg-surface"
                                />
                                {stale ? (
                                  <span className="ml-1.5 inline-flex items-center gap-1 text-2xs text-warning">
                                    <AlertTriangle className="h-3 w-3" /> rate {Math.round(materialAges[item.description])} d old
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-2 py-1">
                                <select
                                  value={item.kind}
                                  onChange={(e) => updateItem(section.id, item.id, { kind: e.target.value as EstimateItemKind })}
                                  aria-label="Cost type"
                                  className="w-[124px] rounded border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none hover:border-hairline focus:border-accent focus:bg-surface"
                                >
                                  {KINDS.map((k) => <option key={k} value={k}>{k.toLowerCase()}</option>)}
                                </select>
                              </td>
                              <NumCell value={item.quantity} onChange={(v) => updateItem(section.id, item.id, { quantity: v })} label="Quantity" />
                              <td className="px-2 py-1">
                                <select
                                  value={item.unit}
                                  onChange={(e) => updateItem(section.id, item.id, { unit: e.target.value })}
                                  aria-label="Unit"
                                  className="w-[80px] rounded border border-transparent bg-transparent px-1 py-1 text-sm outline-none hover:border-hairline focus:border-accent focus:bg-surface"
                                >
                                  {Array.from(new Set([item.unit, ...UNITS])).map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <NumCell value={item.rate} onChange={(v) => updateItem(section.id, item.id, { rate: v })} label="Rate" />
                              <NumCell value={item.waste} onChange={(v) => updateItem(section.id, item.id, { waste: v })} label="Waste percent" suffix="%" width="w-[64px]" />
                              <td className="num px-2 py-1 text-right text-sm text-muted">{formatMoney(lineCost(item), currency, 0)}</td>
                              <NumCell value={item.markup} onChange={(v) => updateItem(section.id, item.id, { markup: v })} label="Markup percent" suffix="%" width="w-[64px]" />
                              <td className="num px-2 py-1 text-right text-sm font-medium">{formatMoney(lineTotal(item), currency, 0)}</td>
                              <td className="px-1 py-1 text-right">
                                <span className="flex items-center justify-end gap-0.5">
                                  <IconButton label="Duplicate line" onClick={() => addItem(section.id, item)}><Copy className="h-3.5 w-3.5" /></IconButton>
                                  <IconButton label="Delete line" onClick={() => update((d) => { const s = d.sections.find((x) => x.id === section.id); if (s) s.items = s.items.filter((i) => i.id !== item.id); })}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </IconButton>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {!section.items.length ? (
                          <tr><td colSpan={11} className="px-3 py-6 text-center text-sm text-muted">No lines in this section yet.</td></tr>
                        ) : null}
                      </tbody>
                    </table>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline px-2 py-2">
                      <Button size="sm" onClick={() => addItem(section.id)}><Plus className="h-3.5 w-3.5" /> Add line</Button>
                      <Button size="sm" onClick={() => setPickerFor(section.id)}>Insert from rate library</Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}

          <Button onClick={() => update((e) => e.sections.push({ id: `SEC-${Date.now()}`, name: "New section", items: [] }))}>
            <Plus className="h-4 w-4" /> Add section
          </Button>
        </div>

        <aside className="xl:sticky xl:top-[72px] xl:h-fit">
          <Card>
            <CardHeader title="Estimate summary" subtitle="Calculated from the lines on the left" />
            <dl className="divide-y divide-hairline text-sm">
              {[
                ["Materials", totals?.materialsCost],
                ["Labour", totals?.labourCost],
                ["Equipment", totals?.equipmentCost],
                ["Subcontractors", totals?.subcontractCost]
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3 px-4 py-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="num font-medium">{formatMoney(value as number, currency, 0)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 bg-sunken/60 px-4 py-2">
                <dt className="font-medium">Direct cost</dt>
                <dd className="num font-semibold">{formatMoney(totals?.directCost, currency, 0)}</dd>
              </div>
              <PctRow label="Overhead" pct={draft.overheadPct} amount={totals?.overhead ?? 0} currency={currency} onChange={(v) => update((e) => { e.overheadPct = v; })} />
              <PctRow label="Contingency" pct={draft.contingencyPct} amount={totals?.contingency ?? 0} currency={currency} onChange={(v) => update((e) => { e.contingencyPct = v; })} />
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <dt className="text-muted">Markup value</dt>
                <dd className="num font-medium">{formatMoney(totals?.profit, currency, 0)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <dt className="text-muted">Discount</dt>
                <dd>
                  <input
                    type="number"
                    value={draft.discount}
                    onChange={(e) => update((d) => { d.discount = Number(e.target.value); })}
                    aria-label="Discount amount"
                    className="num w-24 rounded border border-hairline bg-surface px-1.5 py-0.5 text-right text-sm"
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <dt className="font-medium">Subtotal</dt>
                <dd className="num font-semibold">{formatMoney(totals?.subtotal, currency, 0)}</dd>
              </div>
              <TaxRow
                pct={draft.taxPct}
                amount={totals?.tax ?? 0}
                currency={currency}
                taxRates={taxRates}
                onChange={(v) => update((e) => { e.taxPct = v; })}
              />
              <div className="flex items-center justify-between gap-3 bg-accent/[0.07] px-4 py-3">
                <dt className="font-semibold">Quote total</dt>
                <dd className="num text-lg font-semibold">{formatMoney(totals?.total, currency, 0)}</dd>
              </div>
            </dl>
            <div className="border-t border-hairline px-4 py-3">
              <p className="label-micro">Profit protection</p>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="num text-3xl font-semibold">{formatPercent(totals?.grossMargin ?? 0)}</span>
                <span className="num text-sm text-muted">{formatMoney(totals?.grossProfit, currency, 0)} gross profit</span>
              </div>
              {(totals?.grossMargin ?? 0) < 15 ? (
                <p className="mt-2 flex gap-1.5 rounded border border-warning/30 bg-warning/10 px-2 py-1.5 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Margin is below your 15% target. Review markups and overhead before issuing.
                </p>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>

      {/* AI review panel */}
      {reviewOpen ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm animate-slide-left border-l border-hairline bg-surface shadow-overlay">
          <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                <Sparkles className="h-4 w-4 text-laterite-500" /> AI estimate review
              </h2>
              <p className="text-sm text-muted">
                {reviewing ? "Reviewing estimate..." : `${issues.length} potential issue${issues.length === 1 ? "" : "s"} found`}
                {aiProvider ? ` · ${aiProvider}` : ""}
              </p>
            </div>
            <IconButton label="Close review" onClick={() => setReviewOpen(false)}><X className="h-4 w-4" /></IconButton>
          </div>
          <div className="h-[calc(100%-64px)] overflow-y-auto p-3">
            <p className="mb-3 rounded border border-hairline bg-sunken px-3 py-2 text-xs text-muted">
              Nothing is changed automatically. Review each point and decide what belongs in the estimate.
            </p>
            <ul className="space-y-2">
              {issues.map((issue, i) => (
                <li key={issue.id} className="rounded-lg border border-hairline p-3">
                  <p className="flex gap-2 text-base font-medium">
                    <span className="num text-muted">{i + 1}.</span>
                    <span>{issue.title}</span>
                  </p>
                  <p className="mt-1 pl-5 text-sm leading-relaxed text-muted">{issue.detail}</p>
                  <div className="mt-2 flex gap-1.5 pl-5">
                    <Button size="sm" variant="primary" onClick={() => { addItem(draft.sections[0]?.id ?? "", { description: issue.title.replace(/ is missing| has been included/i, ""), kind: "MATERIAL" }); setIgnored((x) => [...x, issue.id]); }}>
                      Add line
                    </Button>
                    <Button size="sm" onClick={() => setIgnored((x) => [...x, issue.id])}>Ignore</Button>
                  </div>
                </li>
              ))}
              {!issues.length ? <li className="px-2 py-10 text-center text-sm text-muted">No outstanding issues. This estimate looks complete.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}

      {selectedItems.length ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2 shadow-overlay">
          <span className="num rounded bg-accent/10 px-2 py-1 text-sm font-medium text-accent">
            {selectedItems.length} position{selectedItems.length === 1 ? "" : "s"} selected
          </span>
          <Button size="sm" variant="danger" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /> Delete selected</Button>
          <Menu
            width="w-44"
            trigger={({ toggle }) => <Button size="sm" onClick={toggle}>Change unit</Button>}
          >
            {(close) => (
              <>
                <MenuLabel>Unit</MenuLabel>
                {UNITS.slice(0, 14).map((unit) => (
                  <MenuItem key={unit} onClick={() => { changeSelectedUnit(unit); close(); }}>{unit}</MenuItem>
                ))}
              </>
            )}
          </Menu>
          <Button size="sm" onClick={() => {
            selectedFlatItems.forEach(({ section, item }) => addItem(section.id, item));
            setToast(`${selectedItems.length} position${selectedItems.length === 1 ? "" : "s"} duplicated.`);
            clearSelection();
          }}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button size="sm" onClick={clearSelection}>Clear selection</Button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => addItem(draft.sections[0]?.id ?? "")}
        aria-label="Add position"
        className="fixed bottom-5 right-24 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-overlay transition hover:-translate-y-0.5 hover:bg-brand-700 lg:flex"
      >
        <Plus className="h-5 w-5" />
      </button>

      {toast ? (
        <div className="fixed right-5 top-20 z-[70] flex max-w-sm animate-slide-up items-start gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-sm text-success shadow-raised">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{toast}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setToast(null)} className="ml-2 text-success/70 hover:text-success">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Rate library picker */}
      <Modal open={Boolean(pickerFor)} onClose={() => setPickerFor(null)} title="Insert from rate library" description="Rates come from the saved material list." width="max-w-2xl">
        <PriceBookPicker
          materials={materials}
          currency={currency}
          onPick={(material) => {
            if (!pickerFor) return;
            addItem(pickerFor, {
              description: material.name,
              unit: material.unit,
              rate: material.cost,
              category: material.category,
              kind: "MATERIAL",
              waste: 5
            });
            setPickerFor(null);
          }}
        />
      </Modal>

      {/* Bulk edit */}
      <BulkEditModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onApply={(patch) => {
          update((e) => {
            e.sections.forEach((s) => s.items.forEach((i) => {
              if (patch.markup !== undefined) i.markup = patch.markup;
              if (patch.waste !== undefined && i.kind === "MATERIAL") i.waste = patch.waste;
            }));
            if (patch.tax !== undefined) e.taxPct = patch.tax;
          });
          setBulkOpen(false);
        }}
      />

      <ImportLinesModal
        open={Boolean(importOpen)}
        mode={importOpen ?? "paste"}
        onClose={() => setImportOpen(null)}
        onImport={(text) => importRows(parseEstimateRows(text))}
        onFile={importFile}
      />

      {/* Preview */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview  ${draft.id}`}
        description="Client-facing view. Cost and margin are never shown to the client."
        width="max-w-3xl"
        footer={<><Button onClick={() => setPreviewOpen(false)}>Close</Button><Button variant="primary" onClick={createQuote}>Create quotation</Button></>}
      >
        <div className="space-y-4">
          {draft.sections.map((section) => (
            <div key={section.id}>
              <p className="label-micro mb-1">{section.name}</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-hairline">
                    {["Description", "Qty", "Unit", "Rate", "Amount"].map((h, i) => (
                      <th key={h} className={`px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item) => (
                    <tr key={item.id} className="border-b border-hairline last:border-0">
                      <td className="px-2 py-1.5 text-sm">{item.description || ""}</td>
                      <td className="num px-2 py-1.5 text-right text-sm">{formatNumber(adjustedQuantity(item))}</td>
                      <td className="num px-2 py-1.5 text-right text-sm">{item.unit}</td>
                      <td className="num px-2 py-1.5 text-right text-sm">{formatMoney(item.rate * (1 + item.markup / 100), currency)}</td>
                      <td className="num px-2 py-1.5 text-right text-sm font-medium">{formatMoney(lineTotal(item), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <dl className="ml-auto w-64 space-y-1 border-t border-hairline pt-3 text-sm">
            {[["Subtotal", totals?.subtotal], ["Tax", totals?.tax], ["Discount", -(totals?.discount ?? 0)]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between"><dt className="text-muted">{l}</dt><dd className="num">{formatMoney(v as number, currency)}</dd></div>
            ))}
            <div className="flex justify-between border-t border-hairline pt-1 text-base font-semibold">
              <dt>Total</dt><dd className="num">{formatMoney(totals?.total, currency)}</dd>
            </div>
          </dl>
        </div>
      </Modal>
    </>
  );
}

function NumCell({ value, onChange, label, suffix, width = "w-[92px]" }: {
  value: number; onChange: (v: number) => void; label: string; suffix?: string; width?: string;
}) {
  return (
    <td className="px-2 py-1 text-right">
      <span className="relative inline-flex items-center">
        <input
          type="number"
          step="0.01"
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`num ${width} rounded border border-transparent bg-transparent px-1.5 py-1 text-right text-sm outline-none hover:border-hairline focus:border-accent focus:bg-surface`}
        />
        {suffix ? <span className="pointer-events-none -ml-3 text-xs text-subtle">{suffix}</span> : null}
      </span>
    </td>
  );
}

function PctRow({ label, pct, amount, currency, onChange }: {
  label: string; pct: number; amount: number; currency: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <dt className="flex items-center gap-1.5 text-muted">
        {label}
        <input
          type="number"
          value={pct}
          aria-label={`${label} percent`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num w-14 rounded border border-hairline bg-surface px-1 py-0.5 text-right text-xs"
        />
        <span className="text-xs text-subtle">%</span>
      </dt>
      <dd className="num font-medium">{formatMoney(amount, currency, 0)}</dd>
    </div>
  );
}

function TaxRow({ pct, amount, currency, taxRates, onChange }: {
  pct: number;
  amount: number;
  currency: string;
  taxRates: { id: string; name: string; rate: number }[];
  onChange: (v: number) => void;
}) {
  const selected = taxRates.find((tax) => tax.rate === pct)?.id ?? "";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <dt className="flex min-w-0 items-center gap-1.5 text-muted">
        <span>Tax</span>
        {taxRates.length ? (
          <select
            value={selected}
            aria-label="Configured tax rate"
            onChange={(event) => {
              const tax = taxRates.find((row) => row.id === event.target.value);
              if (tax) onChange(tax.rate);
            }}
            className="max-w-24 rounded border border-hairline bg-surface px-1 py-0.5 text-xs"
          >
            <option value="">Custom</option>
            {taxRates.map((tax) => (
              <option key={tax.id} value={tax.id}>{tax.name}</option>
            ))}
          </select>
        ) : null}
        <input
          type="number"
          value={pct}
          aria-label="Tax percent"
          onChange={(event) => onChange(Number(event.target.value))}
          className="num w-14 rounded border border-hairline bg-surface px-1 py-0.5 text-right text-xs"
        />
        <span className="text-xs text-subtle">%</span>
      </dt>
      <dd className="num font-medium">{formatMoney(amount, currency, 0)}</dd>
    </div>
  );
}

function PriceBookPicker({ materials, currency, onPick }: { materials: Material[]; currency: string; onPick: (m: Material) => void }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const filtered = materials.filter(
    (m) => (!category || m.category === category) && (!q || `${m.name} ${m.brand}`.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search materials…" aria-label="Search materials" data-autofocus />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="w-56">
          <option value="">All categories</option>
          {CONSTRUCTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-hairline">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-hairline">
              {["Material", "Brand", "Unit", "Cost", ""].map((h, i) => (
                <th key={h} className={`px-3 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 60).map((m) => (
              <tr key={m.id} className="border-b border-hairline last:border-0 hover:bg-sunken/60">
                <td className="px-3 py-2 text-sm font-medium">{m.name}</td>
                <td className="px-3 py-2 text-sm text-muted">{m.brand}</td>
                <td className="px-3 py-2 text-sm">{m.unit}</td>
                <td className="num px-3 py-2 text-right text-sm">{formatMoney(m.cost, currency)}</td>
                <td className="px-3 py-2 text-right"><Button size="sm" variant="primary" onClick={() => onPick(m)}>Insert</Button></td>
              </tr>
            ))}
            {!filtered.length ? <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">No materials match that search.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkEditModal({ open, onClose, onApply }: {
  open: boolean; onClose: () => void; onApply: (patch: { markup?: number; waste?: number; tax?: number }) => void;
}) {
  const [markup, setMarkup] = useState("");
  const [waste, setWaste] = useState("");
  const [tax, setTax] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk edit"
      description="Apply the same markup, waste allowance or tax rate across the estimate."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onApply({
              markup: markup === "" ? undefined : Number(markup),
              waste: waste === "" ? undefined : Number(waste),
              tax: tax === "" ? undefined : Number(tax)
            })}
          >
            Apply
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Markup %" hint="all lines"><Input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="15" /></Field>
        <Field label="Waste %" hint="materials"><Input type="number" value={waste} onChange={(e) => setWaste(e.target.value)} placeholder="5" /></Field>
        <Field label="Tax %" hint="estimate"><Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="15" /></Field>
      </div>
    </Modal>
  );
}

function ImportLinesModal({ open, mode, onClose, onImport, onFile }: {
  open: boolean;
  mode: "csv" | "paste";
  onClose: () => void;
  onImport: (text: string) => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [text, setText] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "csv" ? "Import estimate lines" : "Paste estimate lines"}
      description="Use columns: description, quantity, unit, rate, kind, waste, markup."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onImport(text); setText(""); }} disabled={!text.trim()}>
            Import lines
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {mode === "csv" ? (
          <Field label="CSV or TSV file" hint="The file is read in your browser and then added to the draft.">
            <Input type="file" accept=".csv,.tsv,.txt" onChange={onFile} />
          </Field>
        ) : null}
        <Field label={mode === "csv" ? "Or paste rows" : "Rows"}>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            data-autofocus
            placeholder={"description,quantity,unit,rate,kind,waste,markup\nCement 50kg,20,bag,95,MATERIAL,5,15"}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
      </div>
    </Modal>
  );
}
