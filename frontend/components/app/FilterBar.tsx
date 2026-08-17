"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { Select } from "../ui/Field";

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  query, onQuery, placeholder = "Search…", filters = [], values, onChange, extra, advanced
}: {
  query: string;
  onQuery: (v: string) => void;
  placeholder?: string;
  filters?: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  extra?: ReactNode;
  advanced?: ReactNode;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const active = Object.entries(values).filter(([, v]) => v);

  return (
    <div className="mb-3 rounded-lg border border-hairline bg-surface">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="field pl-8"
          />
        </div>
        {filters.slice(0, 3).map((filter) => (
          <Select
            key={filter.key}
            aria-label={filter.label}
            value={values[filter.key] ?? ""}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="w-auto min-w-[128px]"
          >
            <option value="">{filter.label}: all</option>
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        ))}
        {filters.length > 3 || advanced ? (
          <Button variant={showAdvanced ? "primary" : "secondary"} onClick={() => setShowAdvanced((v) => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            {active.length ? <span className="num ml-1 rounded bg-black/10 px-1 text-2xs">{active.length}</span> : null}
          </Button>
        ) : null}
        {extra}
      </div>

      {showAdvanced ? (
        <div className="grid gap-2 border-t border-hairline p-2 sm:grid-cols-2 lg:grid-cols-4">
          {filters.slice(3).map((filter) => (
            <label key={filter.key} className="block">
              <span className="label-micro mb-1 block">{filter.label}</span>
              <Select value={values[filter.key] ?? ""} onChange={(e) => onChange(filter.key, e.target.value)}>
                <option value="">All</option>
                {filter.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </label>
          ))}
          {advanced}
        </div>
      ) : null}

      {active.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline px-2 py-1.5">
          <span className="label-micro">Active</span>
          {active.map(([key, value]) => (
            <button
              key={key}
              onClick={() => onChange(key, "")}
              className="inline-flex items-center gap-1 rounded border border-hairline bg-sunken px-1.5 py-0.5 text-xs text-muted hover:text-fg"
            >
              {(filters.find((f) => f.key === key)?.label ?? key)}: {value.replace(/_/g, " ").toLowerCase()}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={() => active.forEach(([key]) => onChange(key, ""))}
            className="ml-1 text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
