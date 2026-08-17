"use client";

import { useState } from "react";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { LogoMark } from "../brand/Logo";

type Tab = "estimate" | "quotation" | "dashboard" | "cash";

const TABS: { value: Tab; label: string; caption: string }[] = [
  { value: "estimate", label: "Estimate builder", caption: "Dense, keyboard-driven, totals recalculated on every keystroke." },
  { value: "quotation", label: "Client quotation", caption: "What the client receives. Cost and margin never appear." },
  { value: "dashboard", label: "Dashboard", caption: "The six numbers that decide what you do today." },
  { value: "cash", label: "Cash & invoices", caption: "Milestones, receipts and what is still owed." }
];

export function ProductPreview() {
  const [tab, setTab] = useState<Tab>("estimate");
  const active = TABS.find((t) => t.value === tab)!;

  return (
    <div>
      <div role="tablist" aria-label="Product views" className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-accent text-accent-fg" : "border border-hairline bg-surface text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-raised">
        <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
          <LogoMark size={18} />
          <span className="num text-xs text-muted">obuadey-construction / {tab === "cash" ? "invoices" : tab}</span>
          <span className="ml-auto flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-hairline" />)}
          </span>
        </div>

        {tab === "estimate" ? <EstimateView /> : null}
        {tab === "quotation" ? <QuotationView /> : null}
        {tab === "dashboard" ? <DashboardView /> : null}
        {tab === "cash" ? <CashView /> : null}
      </div>
      <p className="mt-2 text-sm text-muted">{active.caption}</p>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={`px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function EstimateView() {
  const rows = [
    ["Excavation to reduce level", "48", "m³", "120", "5,760", "15%", "6,624"],
    ["Concrete C25 in foundation", "22", "m³", "980", "21,560", "15%", "24,794"],
    ["Reinforcement 12 mm", "1.8", "tonne", "10,200", "18,360", "12%", "20,563"],
    ["Masonry labour", "14", "day", "220", "3,080", "15%", "3,542"],
    ["Hardcore filling", "26", "m³", "180", "4,680", "15%", "5,382"]
  ];
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_216px]">
      <div className="min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 border-b border-hairline bg-sunken/60 px-3 py-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider">Foundation</span>
          <span className="num ml-auto text-xs text-muted">5 items · cost GHS 53,440</span>
        </div>
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <Th>Description</Th><Th right>Qty</Th><Th>Unit</Th><Th right>Rate</Th><Th right>Cost</Th><Th right>Markup</Th><Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-b border-hairline last:border-0">
                {row.map((cell, i) => (
                  <td key={i} className={`px-2 py-1.5 text-sm ${i === 0 ? "whitespace-nowrap font-medium" : "num text-right"} ${i === 2 ? "text-left" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-hairline px-3 py-2">
          <span className="inline-flex items-center gap-1.5 rounded border border-laterite-200 bg-laterite-50 px-2 py-1 text-xs text-laterite-700 dark:border-laterite-600/40 dark:bg-laterite-600/15 dark:text-laterite-200">
            <Sparkles className="h-3 w-3" /> AI review: 4 potential issues
          </span>
        </div>
      </div>

      <aside className="border-t border-hairline lg:border-l lg:border-t-0">
        <p className="label-micro px-3 pb-1 pt-2">Summary</p>
        <dl className="divide-y divide-hairline text-sm">
          {[
            ["Materials", "280,400"], ["Labour", "126,200"], ["Equipment", "34,500"], ["Subcontractors", "48,000"]
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between px-3 py-1.5"><dt className="text-muted">{l}</dt><dd className="num">{v}</dd></div>
          ))}
          <div className="flex justify-between bg-sunken/60 px-3 py-1.5 font-medium"><dt>Direct cost</dt><dd className="num">489,100</dd></div>
          <div className="flex justify-between px-3 py-1.5"><dt className="text-muted">Overhead 8%</dt><dd className="num">39,128</dd></div>
          <div className="flex justify-between px-3 py-1.5"><dt className="text-muted">Contingency 3%</dt><dd className="num">14,673</dd></div>
          <div className="flex justify-between bg-accent/[0.07] px-3 py-2 font-semibold"><dt>Quote total</dt><dd className="num">623,228</dd></div>
        </dl>
        <div className="px-3 py-2">
          <p className="label-micro">Gross margin</p>
          <p className="num text-2xl font-semibold">19.5%</p>
        </div>
      </aside>
    </div>
  );
}

function QuotationView() {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between border-b border-hairline pb-4">
        <div>
          <p className="text-base font-semibold">Obuadey Construction</p>
          <p className="text-xs text-muted">Accra, Greater Accra · TIN C0012345678</p>
        </div>
        <div className="text-right">
          <p className="label-micro">Quotation</p>
          <p className="num text-base font-semibold">QUO-2026-0088</p>
          <p className="num text-xs text-muted">Valid until 30 Sep 2026</p>
        </div>
      </div>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline"><Th>Foundation</Th><Th right>Qty</Th><Th right>Unit</Th><Th right>Rate</Th><Th right>Amount</Th></tr>
        </thead>
        <tbody>
          {[
            ["Excavation to reduce level", "48", "m³", "138.00", "6,624"],
            ["Concrete C25 in foundation", "22", "m³", "1,127.00", "24,794"],
            ["Reinforcement 12 mm", "1.8", "tonne", "11,424.00", "20,563"]
          ].map((row) => (
            <tr key={row[0]} className="border-b border-hairline last:border-0">
              {row.map((cell, i) => (
                <td key={i} className={`px-2 py-2 text-sm ${i === 0 ? "" : "num text-right"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 w-56 space-y-1 border-t border-hairline pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="num">GHS 541,937</dd></div>
        <div className="flex justify-between"><dt className="text-muted">VAT 15%</dt><dd className="num">GHS 81,291</dd></div>
        <div className="flex justify-between border-t border-hairline pt-1 text-base font-semibold"><dt>Total</dt><dd className="num">GHS 623,228</dd></div>
      </dl>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
        <Check className="h-4 w-4" /> Accepted by client · 12 Aug 2026, 14:20 · recorded with device and IP
      </div>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["Revenue", "GHS 482,350", "↑ 12.4%"],
          ["Outstanding", "GHS 184,200", "12 invoices"],
          ["Active projects", "18", "4 need attention"],
          ["Win rate", "46.7%", "↑ 5.8%"],
          ["Gross profit", "GHS 103,440", "21.4% margin"],
          ["Cash collected", "GHS 536,200", "↑ 8.1%"]
        ].map(([label, value, foot]) => (
          <div key={label} className="rounded-lg border border-hairline px-3 py-2">
            <p className="label-micro">{label}</p>
            <p className="num mt-0.5 text-lg font-semibold">{value}</p>
            <p className="num text-xs text-muted">{foot}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-hairline p-3">
          <p className="label-micro mb-2">Revenue, cost and profit</p>
          <div className="flex h-24 items-end gap-1.5" aria-hidden>
            {[38, 52, 44, 61, 49, 70, 58, 76, 64, 82, 71, 88].map((h, i) => (
              <span key={i} className="flex-1 rounded-t-sm bg-accent/70" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-hairline p-3">
          <p className="label-micro mb-2">Needs attention</p>
          <ul className="space-y-1.5 text-xs">
            {[
              ["East Legon Residence", "82% spent · 65% complete"],
              ["Tema Office Fitout", "3 invoices overdue"],
              ["Cement rate", "82 days old"]
            ].map(([a, b]) => (
              <li key={a} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                <span><span className="font-medium">{a}</span> <span className="num text-muted"> {b}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CashView() {
  return (
    <div className="p-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline"><Th>Invoice</Th><Th>Client</Th><Th right>Total</Th><Th right>Outstanding</Th><Th right>Due</Th></tr>
        </thead>
        <tbody>
          {[
            ["INV-2026-0032", "Adom Properties", "170,000", "51,000", "8 d overdue", "danger"],
            ["INV-2026-0034", "Nana Mensah", "96,500", "96,500", "Due in 3 d", "warning"],
            ["INV-2026-0035", "Ridge Estates", "240,000", "0", "Paid", "success"]
          ].map(([id, client, total, out, due, tone]) => (
            <tr key={id} className="border-b border-hairline last:border-0">
              <td className="num px-2 py-2 text-sm font-medium">{id}</td>
              <td className="px-2 py-2 text-sm">{client}</td>
              <td className="num px-2 py-2 text-right text-sm">{total}</td>
              <td className="num px-2 py-2 text-right text-sm">{out}</td>
              <td className="px-2 py-2 text-right">
                <span className={`inline-flex rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider ${
                  tone === "danger" ? "border-danger/25 bg-danger/10 text-danger"
                    : tone === "warning" ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-success/25 bg-success/10 text-success"
                }`}>{due}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Mobilisation 20%", "Paid"], ["Foundation 15%", "Paid"], ["Superstructure 20%", "Invoiced"]].map(([m, s]) => (
          <div key={m} className="rounded-lg border border-hairline px-3 py-2">
            <p className="text-xs font-medium">{m}</p>
            <p className="num text-2xs uppercase tracking-wider text-muted">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
