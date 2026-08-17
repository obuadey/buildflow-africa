"use client";

import { useMemo, useState } from "react";
import { useDebounced } from "../../lib/client";

export function useListState(initial: Record<string, string> = {}, defaultSort?: string) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(initial);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string | undefined>(defaultSort);
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const debounced = useDebounced(query, 220);

  const params = useMemo(
    () => ({ q: debounced, page, size: 25, sort, dir, ...filters }),
    [debounced, page, sort, dir, filters]
  );

  return {
    query,
    setQuery: (v: string) => { setQuery(v); setPage(1); },
    filters,
    setFilter: (key: string, value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); },
    page,
    setPage,
    sort,
    dir,
    onSort: (key: string, nextDir: "asc" | "desc") => { setSort(key); setDir(nextDir); },
    params
  };
}

export function optionsFrom(values: string[]) {
  return values.map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
}
