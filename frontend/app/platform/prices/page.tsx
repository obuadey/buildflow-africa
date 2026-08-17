"use client";

import { useState } from "react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Select } from "../../../components/ui/Field";
import { Modal } from "../../../components/ui/Overlay";
import { Skeleton, SkeletonRows } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/EmptyState";
import { MiniTable } from "../../../components/ui/Tabs";
import { usePlatform, platformPost, platformDelete } from "../../../lib/platform";
import { formatMoney, formatDate } from "../../../lib/format";
import { useDebounced, downloadCsv, toCsv } from "../../../lib/client";
import { GHANA_REGIONS } from "../../../lib/regions";

type Summary = {
  rates: number; national: number; regional: number; imported: number;
  templates: number; assemblies: number; importBatches: number;
  newestRate: string | null; oldestRate: string | null;
  categories: { category: string; rates: number; national: number }[];
  regions: { region: string; rates: number }[];
};

type Price = {
  id: string; country: string; region: string | null; city: string | null; category: string | null;
  material: string; brand: string | null; unit: string; price: number; source: string;
  effectiveDate: string; ageDays: number | null; fromImport: boolean;
};

type Draft = {
  materialName: string; unit: string; price: string; category: string; brand: string;
  region: string; city: string; source: string; effectiveDate: string;
};

const EMPTY: Draft = {
  materialName: "", unit: "", price: "", category: "", brand: "",
  region: "", city: "", source: "", effectiveDate: ""
};

/**
 * The shared cost library, from the operator's side.
 *
 * This is the one page in the product where a figure typed here changes what a contractor
 * somewhere else sees, so the page says out loud where each rate stands: whether it is national or
 * regional, whether it came from a file with a named source or from an operator's keyboard, and
 * how old it is. Every write goes to the platform audit trail.
 */
export default function PlatformPricesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Price | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const q = useDebounced(query, 220);

  const summary = usePlatform<Summary>("library");
  const list = usePlatform<{ rows: Price[]; total: number; pages: number }>(
    `prices?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`
      + `&region=${encodeURIComponent(region)}&page=${page}&size=50`
  );

  function openCreate() {
    setDraft(EMPTY);
    setEditing(null);
    setProblem(null);
    setCreating(true);
  }

  function openEdit(price: Price) {
    setDraft({
      materialName: price.material,
      unit: price.unit,
      price: String(price.price),
      category: price.category ?? "",
      brand: price.brand ?? "",
      region: price.region ?? "",
      city: price.city ?? "",
      source: price.source ?? "",
      effectiveDate: price.effectiveDate ?? ""
    });
    setProblem(null);
    setEditing(price);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setBusy(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    const body = {
      materialName: draft.materialName.trim(),
      unit: draft.unit.trim(),
      price: Number(draft.price),
      category: draft.category.trim() || null,
      brand: draft.brand.trim() || null,
      region: draft.region.trim() || null,
      city: draft.city.trim() || null,
      source: draft.source.trim() || null,
      effectiveDate: draft.effectiveDate || null
    };
    try {
      if (editing) {
        await platformPost(`prices/${editing.id}`, body, "PATCH");
      } else {
        await platformPost("prices", body);
      }
      close();
      list.refresh();
      summary.refresh();
    } catch (error) {
      setProblem((error as { message?: string }).message ?? "That rate could not be saved.");
      setBusy(false);
    }
  }

  async function remove(price: Price) {
    // A rate every company reads should not vanish on a stray click.
    if (!window.confirm(
      `Remove "${price.material}" ${price.region ? `(${price.region})` : "(national)"} from the shared library?`
      + " Companies without their own price for it will stop seeing a rate."
    )) return;
    try {
      await platformDelete(`prices/${price.id}`);
      list.refresh();
      summary.refresh();
    } catch (error) {
      setProblem((error as { message?: string }).message ?? "That rate could not be removed.");
    }
  }

  const data = summary.data;
  const kpis = [
    ["Rates", data?.rates, `${data?.national ?? 0} national · ${data?.regional ?? 0} regional`],
    ["Trades", data?.categories.length, "priced categories"],
    ["Regions", data?.regions.length, "with their own rates"],
    ["Templates", data?.templates, `${data?.assemblies ?? 0} assemblies`],
    ["From imports", data?.imported, `${data?.importBatches ?? 0} loaded files`]
  ] as const;

  return (
    <>
      <PageHeader
        title="Cost library"
        description="The rates every company falls back to when it has no price of its own. A change here is
          recorded in the audit trail and reaches every contractor without their own figure for that item."
        actions={
          <span className="flex gap-1.5">
            <Button
              onClick={() => downloadCsv("reference-prices.csv", toCsv(
                (list.data?.rows ?? []) as unknown as Record<string, unknown>[],
                [
                  { key: "category", label: "Trade" }, { key: "material", label: "Material" },
                  { key: "brand", label: "Brand" }, { key: "unit", label: "Unit" },
                  { key: "price", label: "Rate" }, { key: "region", label: "Region" },
                  { key: "source", label: "Source" }, { key: "effectiveDate", label: "Effective" }
                ]
              ))}
              disabled={!list.data?.rows?.length}
            >
              Export page
            </Button>
            <Button variant="primary" onClick={openCreate}>Add a rate</Button>
          </span>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([label, value, foot]) => (
          <Card key={label} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            {summary.loading ? <Skeleton className="mt-2 h-7 w-20" />
              : <p className="num mt-1 text-3xl font-semibold">{value ?? 0}</p>}
            <p className="mt-0.5 text-xs text-muted">{foot}</p>
          </Card>
        ))}
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Coverage by trade"
            subtitle="National rates against the total held for each trade"
          />
          <MiniTable
            head={["Trade", "Rates", "National"]}
            rows={(data?.categories ?? []).map((row) => [
              row.category, String(row.rates), String(row.national)
            ])}
            empty="The library is empty."
          />
        </Card>

        <Card>
          <CardHeader
            title="Regional rates"
            subtitle="A company in one of these regions prices from its own column first"
          />
          <MiniTable
            head={["Region", "Rates"]}
            rows={(data?.regions ?? []).map((row) => [row.region, String(row.rates)])}
            empty="Every rate is national. No company will match a regional figure."
          />
        </Card>

        <Card>
          <CardHeader title="How old the library is" subtitle="Effective dates held across every rate" />
          <div className="px-4 py-3">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Newest rate</dt>
                <dd className="num">{data?.newestRate ? formatDate(data.newestRate) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Oldest rate</dt>
                <dd className="num">{data?.oldestRate ? formatDate(data.oldestRate) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Loaded from files</dt>
                <dd className="num">{data?.imported ?? 0}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Seeded rates are indicative baselines, not a published schedule. A rate imported from a
              named source, or entered here, replaces the baseline for everyone who has no price of
              their own.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mb-3 mt-3 flex flex-wrap items-center gap-2 p-2">
        <Input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Search material, brand, trade or source…"
          aria-label="Search the cost library"
          className="min-w-[240px] flex-1"
        />
        <Select
          value={category}
          onChange={(event) => { setCategory(event.target.value); setPage(1); }}
          aria-label="Trade"
          className="w-auto"
        >
          <option value="">All trades</option>
          {(data?.categories ?? []).map((row) => (
            <option key={row.category} value={row.category}>{row.category}</option>
          ))}
        </Select>
        <Select
          value={region}
          onChange={(event) => { setRegion(event.target.value); setPage(1); }}
          aria-label="Region"
          className="w-auto"
        >
          <option value="">Every region</option>
          <option value="national">National only</option>
          {GHANA_REGIONS.map((name) => <option key={name} value={name}>{name}</option>)}
        </Select>
        <span className="num ml-auto text-sm text-muted">{list.data?.total ?? 0} rates</span>
      </Card>

      {problem ? <p className="mb-2 text-sm text-danger">{problem}</p> : null}

      <Card className="overflow-hidden">
        {list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  {["Material", "Trade", "Unit", "Rate", "Coverage", "Source", "Effective", ""].map((head) => (
                    <th key={head} className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wider text-muted">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.loading ? <SkeletonRows rows={10} cols={8} /> : (list.data?.rows ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-sunken/60">
                    <td className="px-3 py-2.5 text-sm font-medium">
                      {row.material}
                      {row.brand ? <span className="ml-1.5 text-xs text-muted">{row.brand}</span> : null}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted">{row.category ?? "—"}</td>
                    <td className="px-3 py-2.5 text-sm text-muted">{row.unit}</td>
                    <td className="num px-3 py-2.5 text-sm">{formatMoney(row.price)}</td>
                    <td className="px-3 py-2.5">
                      {row.region
                        ? <Badge tone="info">{row.city ? `${row.region} · ${row.city}` : row.region}</Badge>
                        : <Badge tone="neutral">national</Badge>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted">
                      {row.source}
                      {row.fromImport ? <Badge tone="success" className="ml-1.5">imported</Badge> : null}
                    </td>
                    <td className="num px-3 py-2.5 text-sm text-muted">
                      {formatDate(row.effectiveDate)}
                      {row.ageDays !== null && row.ageDays > 60
                        ? <Badge tone="warning" className="ml-1.5">{row.ageDays}d</Badge>
                        : null}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="flex justify-end gap-1.5">
                        <Button size="sm" onClick={() => openEdit(row)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(row)}>Remove</Button>
                      </span>
                    </td>
                  </tr>
                ))}
                {!list.loading && !(list.data?.rows ?? []).length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted">
                      No rate in the library matches that search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        {(list.data?.pages ?? 1) > 1 ? (
          <div className="flex items-center justify-between border-t border-hairline px-3 py-2">
            <p className="num text-sm text-muted">Page {page} of {list.data?.pages}</p>
            <span className="flex gap-1.5">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button size="sm" disabled={page >= (list.data?.pages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </span>
          </div>
        ) : null}
      </Card>

      <Modal
        open={creating || editing !== null}
        onClose={close}
        title={editing ? "Edit a reference rate" : "Add a reference rate"}
        description="Leave the region empty for a national rate. A region makes it the figure companies in that region price from first."
        footer={
          <>
            <Button onClick={close} disabled={busy}>Cancel</Button>
            <Button
              type="submit"
              form="reference-rate"
              variant="primary"
              disabled={busy || !draft.materialName.trim() || !draft.unit.trim() || Number(draft.price) <= 0}
            >
              {busy ? "Saving…" : "Save rate"}
            </Button>
          </>
        }
      >
        <form id="reference-rate" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Material or item" className="sm:col-span-2" required>
            <Input
              value={draft.materialName} required
              onChange={(event) => setDraft({ ...draft, materialName: event.target.value })}
              placeholder="Portland cement 50kg"
            />
          </Field>
          <Field label="Unit" required>
            <Input
              value={draft.unit} required
              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
              placeholder="bag"
            />
          </Field>
          <Field label="Rate, GHS" required>
            <Input
              type="number" step="0.01" min="0.01" required value={draft.price}
              onChange={(event) => setDraft({ ...draft, price: event.target.value })}
            />
          </Field>
          <Field label="Trade">
            <Input
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              placeholder="Concrete Works"
            />
          </Field>
          <Field label="Brand">
            <Input
              value={draft.brand}
              onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              placeholder="Ghacem"
            />
          </Field>
          <Field label="Region" hint="Empty means the rate applies nationally.">
            <Select value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })}>
              <option value="">National</option>
              {GHANA_REGIONS.map((name) => <option key={name} value={name}>{name}</option>)}
            </Select>
          </Field>
          <Field label="City or town">
            <Input
              value={draft.city}
              onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              placeholder="Kumasi"
            />
          </Field>
          <Field
            label="Source"
            className="sm:col-span-2"
            hint="Name the document or supplier this figure came from. Left empty it is attributed to you."
          >
            <Input
              value={draft.source}
              onChange={(event) => setDraft({ ...draft, source: event.target.value })}
              placeholder="Supplier price list, March 2026"
            />
          </Field>
          <Field label="Effective from" className="sm:col-span-2">
            <Input
              type="date" value={draft.effectiveDate}
              onChange={(event) => setDraft({ ...draft, effectiveDate: event.target.value })}
            />
          </Field>
          {problem ? <p className="text-sm text-danger sm:col-span-2">{problem}</p> : null}
        </form>
      </Modal>
    </>
  );
}
