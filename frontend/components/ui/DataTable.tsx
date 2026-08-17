"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Download, Inbox } from "lucide-react";
import { Button, IconButton } from "./Button";
import { Checkbox } from "./Field";
import { Menu } from "./Menu";
import { SkeletonRows } from "./Skeleton";
import { EmptyState, ErrorState } from "./EmptyState";
import { downloadCsv, toCsv } from "../../lib/client";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  sortable?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
  render?: (row: T) => ReactNode;
  csv?: (row: T) => string | number;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  loading?: boolean;
  error?: { message: string } | null;
  onRetry?: () => void;
  total?: number;
  page?: number;
  pages?: number;
  onPage?: (page: number) => void;
  sort?: string;
  dir?: "asc" | "desc";
  onSort?: (key: string, dir: "asc" | "desc") => void;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  empty?: { title: string; description: string; action?: ReactNode };
  exportName?: string;
  dense?: boolean;
  rowHref?: (row: T) => string;
};

export function DataTable<T>({
  rows, columns, getId, loading, error, onRetry, total, page = 1, pages = 1, onPage, sort, dir = "desc",
  onSort, onRowClick, selectable, bulkActions, empty, exportName, dense
}: DataTableProps<T>) {
  const [hidden, setHidden] = useState<string[]>(() => columns.filter((c) => c.defaultHidden).map((c) => c.key));
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => columns.filter((c) => !hidden.includes(c.key)), [columns, hidden]);
  const selectedRows = rows.filter((r) => selected.includes(getId(r)));
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(getId(r)));

  const exportRows = () => {
    const cols = visible.map((c) => ({ key: c.key, label: c.header }));
    const flat = (selectedRows.length ? selectedRows : rows).map((row) => {
      const record: Record<string, unknown> = {};
      visible.forEach((c) => {
        record[c.key] = c.csv ? c.csv(row) : (row as unknown as Record<string, unknown>)[c.key];
      });
      return record;
    });
    downloadCsv(`${exportName ?? "export"}.csv`, toCsv(flat, cols));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <p className="num text-sm text-muted">
          {loading ? "Loading records" : `${total ?? rows.length} record${(total ?? rows.length) === 1 ? "" : "s"}`}
          {selected.length ? ` · ${selected.length} selected` : ""}
        </p>
        <div className="flex items-center gap-1.5">
          {selected.length && bulkActions ? bulkActions(selectedRows, () => setSelected([])) : null}
          <Menu
            width="w-52"
            trigger={({ toggle }) => (
              <Button size="sm" variant="secondary" onClick={toggle}>
                <Columns3 className="h-3.5 w-3.5" /> Columns
              </Button>
            )}
          >
            {() => (
              <div className="max-h-72 overflow-y-auto p-1">
                {columns.map((c) => (
                  <div key={c.key} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-sunken">
                    <Checkbox
                      label={c.header}
                      checked={!hidden.includes(c.key)}
                      disabled={c.hideable === false}
                      onChange={(e) =>
                        setHidden((h) => (e.target.checked ? h.filter((k) => k !== c.key) : [...h, c.key]))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </Menu>
          <Button size="sm" variant="secondary" onClick={exportRows} disabled={!rows.length}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-19rem)] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-hairline">
              {selectable ? (
                <th scope="col" className="w-9 px-3 py-2">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? rows.map(getId) : [])}
                  />
                </th>
              ) : null}
              {visible.map((c) => {
                const active = sort === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={{ width: c.width }}
                    className={`whitespace-nowrap px-3 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {c.sortable && onSort ? (
                      <button
                        onClick={() => onSort(c.key, active && dir === "desc" ? "asc" : "desc")}
                        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-fg ${active ? "text-fg" : ""}`}
                      >
                        {c.header}
                        {active ? (dir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : null}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={8} cols={visible.length + (selectable ? 1 : 0)} />
            ) : (
              rows.map((row) => {
                const id = getId(row);
                const isSelected = selected.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
                    className={`border-b border-hairline transition-colors last:border-0 ${
                      onRowClick ? "cursor-pointer hover:bg-sunken/70" : ""
                    } ${isSelected ? "bg-accent/[0.06]" : ""}`}
                  >
                    {selectable ? (
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${id}`}
                          checked={isSelected}
                          onChange={(e) => setSelected((s) => (e.target.checked ? [...s, id] : s.filter((x) => x !== id)))}
                        />
                      </td>
                    ) : null}
                    {visible.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 ${dense ? "py-1.5" : "py-2.5"} text-sm ${
                          c.align === "right" ? "num text-right" : c.align === "center" ? "text-center" : "text-left"
                        }`}
                      >
                        {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {!loading && error ? <ErrorState message={error.message} onRetry={onRetry} /> : null}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={empty?.title ?? "Nothing here yet"}
            description={empty?.description ?? "Records will appear here once they are created."}
            action={empty?.action}
          />
        ) : null}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between border-t border-hairline px-3 py-2">
          <p className="num text-sm text-muted">Page {page} of {pages}</p>
          <div className="flex items-center gap-1">
            <IconButton label="Previous page" disabled={page <= 1} onClick={() => onPage?.(page - 1)} variant="secondary">
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton label="Next page" disabled={page >= pages} onClick={() => onPage?.(page + 1)} variant="secondary">
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
