"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, ClipboardPaste, FileSpreadsheet, LayoutTemplate, PencilLine, Sparkles, Upload
} from "lucide-react";
import { PageHeader, SectionTitle } from "../../../components/app/PageHeader";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { defaultEstimateTaxPct, useSettings } from "../../../components/app/useSettings";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Field, Input, Select, Textarea } from "../../../components/ui/Field";
import { ErrorState } from "../../../components/ui/EmptyState";
import { postJson, useList } from "../../../lib/client";
import { formatMoney, formatNumber } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";

type Source = "TEXT" | "PASTE" | "SPREADSHEET" | "TEMPLATE";

type Question = {
  id: string;
  label: string;
  help: string;
  type: "number" | "text" | "choice" | "boolean";
  unit: string | null;
  options: string[];
  default: unknown;
  required: boolean;
};

type Questionnaire = { project_type: string; questions: Question[]; detected: Record<string, unknown> };

type LibraryTemplate = {
  id: string; name: string; category: string | null; description: string | null;
  unit: string; indicative: boolean; lines: number;
};

type DraftLine = {
  description: string;
  quantity: number;
  unit: string;
  kind: string;
  waste: number;
  rate: number | null;
  origin: "PRICE_BOOK" | "SUPPLIER" | "REGIONAL_REFERENCE" | "NATIONAL_REFERENCE" | "NONE";
  source: string | null;
  effectiveDate: string | null;
  ageDays: number | null;
  stale: boolean;
  matchedName: string | null;
  materialId: string | null;
  confidence: number;
};

type Draft = {
  projectType: string;
  basis: Record<string, unknown>;
  sections: { name: string; lines: DraftLine[] }[];
  notes: string[];
  provider: string;
  summary: {
    lines: number; priced: number; unpriced: number; stale: number;
    directCost: number; currency: string;
  };
};

const SOURCES: { id: Source; title: string; blurb: string; icon: typeof PencilLine }[] = [
  {
    id: "TEXT",
    title: "Describe the job",
    blurb: "Write what the work involves in your own words. You confirm the numbers before anything is priced.",
    icon: PencilLine
  },
  {
    id: "PASTE",
    title: "Paste a bill",
    blurb: "Paste lines from a bill of quantities or a tender document. Quantities are read; the rates are not.",
    icon: ClipboardPaste
  },
  {
    id: "SPREADSHEET",
    title: "Upload a take-off",
    blurb: "A CSV or plain text export from your take-off, one item to a line.",
    icon: FileSpreadsheet
  },
  {
    id: "TEMPLATE",
    title: "Start from a template",
    blurb: "A standard build-up from the shared library, scaled to the size of your job. No model involved.",
    icon: LayoutTemplate
  }
];

/** How a rate is described to the estimator, and how much weight the badge should carry. */
const ORIGINS: Record<DraftLine["origin"], { label: string; tone: "success" | "brand" | "warning" | "neutral" }> = {
  PRICE_BOOK: { label: "Your price book", tone: "success" },
  SUPPLIER: { label: "Supplier quote", tone: "success" },
  REGIONAL_REFERENCE: { label: "Regional reference", tone: "brand" },
  NATIONAL_REFERENCE: { label: "National reference", tone: "brand" },
  NONE: { label: "No rate", tone: "warning" }
};

export default function QuickEstimatePage() {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: settings } = useSettings();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [source, setSource] = useState<Source>("TEXT");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [templateSize, setTemplateSize] = useState("");
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = draft?.summary.currency ?? tenant.currency;

  /** Only a written description needs the questionnaire; every other source states its own quantities. */
  const asksQuestions = source === "TEXT";
  const { rows: libraryTemplates } = useList<LibraryTemplate>("reference-library/templates");
  const chosenTemplate = libraryTemplates.find((row) => row.id === templateId);

  function lineKey(sectionIndex: number, lineIndex: number) {
    return `${sectionIndex}:${lineIndex}`;
  }

  /** A rate the estimator typed into an unpriced line wins over the blank the platform returned. */
  const rateFor = useCallback((sectionIndex: number, lineIndex: number, line: DraftLine) => {
    const typed = rates[`${sectionIndex}:${lineIndex}`];
    if (typed !== undefined && typed !== "") return Number(typed);
    return line.rate;
  }, [rates]);

  /** Recomputed from what is on screen, so a rate the estimator fills in is counted immediately. */
  const totals = useMemo(() => {
    if (!draft) return { priced: 0, unpriced: 0, direct: 0 };
    let priced = 0;
    let unpriced = 0;
    let direct = 0;
    draft.sections.forEach((section, sectionIndex) => {
      section.lines.forEach((line, lineIndex) => {
        const rate = rateFor(sectionIndex, lineIndex, line);
        if (rate === null || Number.isNaN(rate)) {
          unpriced += 1;
          return;
        }
        priced += 1;
        direct += line.quantity * (1 + (line.waste ?? 0) / 100) * rate;
      });
    });
    return { priced, unpriced, direct };
  }, [draft, rateFor]);

  async function readFile(file: File) {
    setFileName(file.name);
    setContent(await file.text());
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      if (source === "TEMPLATE") {
        await generate({ size: Number(templateSize) });
        return;
      }
      if (!asksQuestions) {
        await generate({});
        return;
      }
      const result = await postJson<Questionnaire>(
        `/api/t/${tenant.slug}/quick-estimate/questionnaire`, { description: content });
      const prefilled: Record<string, string> = {};
      for (const question of result.questions) {
        if (question.default !== null && question.default !== undefined) {
          prefilled[question.id] = String(question.default);
        }
      }
      setQuestionnaire(result);
      setAnswers(prefilled);
      if (!title) setTitle(result.project_type);
      setStep(2);
    } catch (e) {
      setError((e as { message?: string }).message ?? "The questions could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(parameters: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<Draft>(`/api/t/${tenant.slug}/quick-estimate/generate`,
        { source, content: source === "TEMPLATE" ? templateId : content, parameters });
      setDraft(result);
      setRates({});
      if (!title) setTitle(result.projectType);
      setStep(3);
    } catch (e) {
      setError((e as { message?: string }).message ?? "The draft could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  function submitAnswers() {
    const parameters: Record<string, unknown> = {};
    for (const question of questionnaire?.questions ?? []) {
      const value = answers[question.id];
      if (value === undefined || value === "") continue;
      parameters[question.id] = question.type === "number" ? Number(value) : value;
    }
    void generate(parameters);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const estimate = await postJson<{ id: string }>(`/api/t/${tenant.slug}/quick-estimate/save`, {
        title: title || draft.projectType,
        sections: draft.sections.map((section, sectionIndex) => ({
          name: section.name,
          lines: section.lines.map((line, lineIndex) => ({
            description: line.description,
            kind: line.kind,
            quantity: line.quantity,
            unit: line.unit,
            rate: rateFor(sectionIndex, lineIndex, line),
            waste: line.waste,
            materialId: line.materialId
          }))
        })),
        taxPct: defaultEstimateTaxPct(settings)
      });
      router.push(tenantPath(tenant.slug, `/estimates/${estimate.id}`));
    } catch (e) {
      setError((e as { message?: string }).message ?? "The estimate could not be saved.");
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quick estimate"
        description="A first pass at a bill, priced from your own rates. Every figure says where it came from, and anything we cannot price is left for you to fill in."
        meta={<Badge tone="brand">Step {step} of 3</Badge>}
        actions={step > 1 ? (
          <Button variant="ghost" onClick={() => setStep(step === 3 && asksQuestions ? 2 : 1)}>
            <ArrowLeft size={16} /> Back
          </Button>
        ) : null}
      />

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}

      {step === 1 ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCES.map((option) => {
              const Icon = option.icon;
              const active = source === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { setSource(option.id); setContent(""); setFileName(null); setTemplateId(""); setTemplateSize(""); }}
                  className={`rounded-xl border p-4 text-left transition ${
                    active ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-default hover:border-strong"
                  }`}
                >
                  <Icon size={18} className={active ? "text-brand" : "text-muted"} />
                  <div className="mt-2 text-sm font-semibold">{option.title}</div>
                  <p className="mt-1 text-xs text-muted">{option.blurb}</p>
                </button>
              );
            })}
          </div>

          <Card>
            <CardHeader
              title={source === "TEXT" ? "What is the work?"
                : source === "TEMPLATE" ? "Which template, and how big?" : "The lines to read"}
              subtitle={source === "TEXT"
                ? "Say what is being built, where, and roughly how much of it. We will ask for anything else we need."
                : source === "TEMPLATE"
                ? "Quantities come off the shelf and scale with the size you give. Nothing here is priced until it meets your rates."
                : "One item to a line: a description, a quantity and a unit. Any rates in the text are ignored."}
            />
            <CardBody className="grid gap-3">
              {source === "SPREADSHEET" ? (
                <div className="grid gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void readFile(file);
                    }}
                  />
                  <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                    <Upload size={16} /> {fileName ? "Choose another file" : "Choose a CSV or text file"}
                  </Button>
                  {fileName ? (
                    <p className="text-xs text-muted">
                      {fileName} — {content.split("\n").filter((line) => line.trim()).length} lines read.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {source === "TEMPLATE" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Template" hint={chosenTemplate?.description ?? undefined}>
                    <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                      <option value="">Choose a template</option>
                      {libraryTemplates.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} — {row.lines} lines, per {row.unit}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label={chosenTemplate ? `How many ${chosenTemplate.unit}?` : "Size"}
                    hint={chosenTemplate
                      ? `Quantities are stated per ${chosenTemplate.unit} and multiply by this.`
                      : "Pick a template first."}
                  >
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={templateSize}
                      disabled={!chosenTemplate}
                      placeholder={chosenTemplate?.unit ?? ""}
                      onChange={(event) => setTemplateSize(event.target.value)}
                    />
                  </Field>
                </div>
              ) : (
              <Field
                label={source === "TEXT" ? "Description" : "Content"}
                hint={source === "TEXT"
                  ? "For example: block up and plaster a 4-bedroom bungalow at Kasoa, walls about 240 m2."
                  : undefined}
              >
                <Textarea
                  rows={source === "TEXT" ? 5 : 10}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={source === "TEXT"
                    ? "Describe the job"
                    : "1.1  Excavate foundation trenches   48 m3"}
                />
              </Field>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Nothing is saved until you say so.
                </p>
                <Button
                  onClick={start}
                  disabled={busy || (source === "TEMPLATE"
                    ? !templateId || Number(templateSize) <= 0
                    : content.trim().length < 5)}
                >
                  {busy ? "Working…" : <>Continue <ArrowRight size={16} /></>}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {step === 2 && questionnaire ? (
        <Card>
          <CardHeader
            title={`${questionnaire.project_type}: a few details`}
            subtitle="Anything we picked out of your description is filled in below. Correct it — a stated figure is used as given, and a blank is left out rather than guessed at."
          />
          <CardBody className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {questionnaire.questions.map((question) => (
                <Field key={question.id} label={question.label} hint={question.help || undefined}>
                  {question.type === "choice" ? (
                    <Select
                      value={answers[question.id] ?? ""}
                      onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                    >
                      <option value="">Not stated</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={question.type === "number" ? "number" : "text"}
                      inputMode={question.type === "number" ? "decimal" : undefined}
                      value={answers[question.id] ?? ""}
                      placeholder={question.unit ?? ""}
                      onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                    />
                  )}
                </Field>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={submitAnswers} disabled={busy}>
                {busy ? "Pricing…" : <><Sparkles size={16} /> Draft the bill</>}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step === 3 && draft ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Lines" value={String(draft.summary.lines)} />
            <Stat label="Priced" value={`${totals.priced} of ${draft.summary.lines}`} />
            <Stat
              label="Needs a rate"
              value={String(totals.unpriced)}
              tone={totals.unpriced > 0 ? "warning" : "neutral"}
            />
            <Stat label="Direct cost" value={formatMoney(totals.direct, currency)} />
          </div>

          {draft.notes.length ? (
            <Card>
              <CardBody className="grid gap-1.5">
                {draft.notes.map((note) => (
                  <p key={note} className="text-sm text-muted">— {note}</p>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {draft.sections.map((section, sectionIndex) => (
            <Card key={section.name}>
              <CardHeader title={section.name} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="border-b border-default text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Description</th>
                      <th className="px-4 py-2 text-right font-medium">Quantity</th>
                      <th className="px-4 py-2 font-medium">Unit</th>
                      <th className="px-4 py-2 text-right font-medium">Waste</th>
                      <th className="px-4 py-2 text-right font-medium">Rate</th>
                      <th className="px-4 py-2 font-medium">Where the rate came from</th>
                      <th className="px-4 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.lines.map((line, lineIndex) => {
                      const rate = rateFor(sectionIndex, lineIndex, line);
                      const amount = rate === null || Number.isNaN(rate)
                        ? null
                        : line.quantity * (1 + (line.waste ?? 0) / 100) * rate;
                      const origin = ORIGINS[line.origin];
                      return (
                        <tr key={`${line.description}-${lineIndex}`} className="border-b border-subtle last:border-0">
                          <td className="px-4 py-2">
                            <div className="font-medium">{line.description}</div>
                            <div className="text-xs text-muted">{line.kind.toLowerCase()}</div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(line.quantity)}</td>
                          <td className="px-4 py-2">{line.unit}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {line.waste ? `${formatNumber(line.waste, 0)}%` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {line.rate === null ? (
                              <Input
                                type="number"
                                inputMode="decimal"
                                className="w-28 text-right"
                                placeholder="Enter"
                                value={rates[lineKey(sectionIndex, lineIndex)] ?? ""}
                                onChange={(event) => setRates({
                                  ...rates, [lineKey(sectionIndex, lineIndex)]: event.target.value
                                })}
                              />
                            ) : (
                              <span className="tabular-nums">{formatMoney(line.rate, currency)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge tone={origin.tone}>{origin.label}</Badge>
                              {line.stale ? <Badge tone="warning">{line.ageDays} days old</Badge> : null}
                            </div>
                            {line.matchedName ? (
                              <div className="mt-1 text-xs text-muted">
                                {line.matchedName}
                                {line.source && line.origin !== "PRICE_BOOK" ? ` · ${line.source}` : ""}
                                {line.effectiveDate ? ` · ${line.effectiveDate}` : ""}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-muted">
                                Nothing in your rates matched this line.
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {amount === null ? <span className="text-muted">—</span> : formatMoney(amount, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          <Card>
            <CardBody className="grid gap-3">
              <SectionTitle title="Save this as an estimate" />
              <Field
                label="Title"
                hint="It opens in the estimate builder, where you can adjust the lines, add markup and issue it."
              >
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {totals.unpriced > 0
                    ? `${totals.unpriced} line${totals.unpriced === 1 ? "" : "s"} will be saved without a rate, so the gap stays visible in the sheet.`
                    : "Every line has a rate."}
                </p>
                <Button onClick={save} disabled={busy || !title.trim()}>
                  {busy ? "Saving…" : "Save as estimate"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
        <div className={`mt-1 text-xl font-semibold tabular-nums ${tone === "warning" ? "text-warning" : ""}`}>
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
