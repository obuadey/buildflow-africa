"use client";

export function Tabs<T extends string>({ value, onChange, tabs, className = "" }: {
  value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[]; className?: string;
}) {
  return (
    <div role="tablist" className={`flex gap-4 overflow-x-auto border-b border-hairline ${className}`}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-0.5 pb-2 pt-1 text-base transition-colors ${
              active ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="num ml-1.5 rounded bg-sunken px-1 py-0.5 text-2xs text-muted">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function MiniTable({ head, rows, empty = "Nothing recorded yet." }: {
  head: string[]; rows: React.ReactNode[][]; empty?: string;
}) {
  if (!rows.length) return <p className="px-4 py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-4 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-hairline last:border-0 hover:bg-sunken/60">
              {row.map((cell, k) => (
                <td key={k} className={`px-4 py-2.5 text-sm ${k > 0 ? "num text-right" : "text-left"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
