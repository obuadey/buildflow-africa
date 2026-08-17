"use client";

import { LayoutTemplate } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { Card } from "../../../components/ui/Card";
import { ButtonLink } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useList } from "../../../lib/client";
import { formatDate, formatMoney } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Template } from "../../../lib/types";

export default function TemplatesPage() {
  const { tenant } = useTenantContext();
  const path = (p: string) => tenantPath(tenant.slug, p);
  const state = useListState({}, "uses");
  const { rows, loading } = useList<Template>("templates", { ...state.params, size: 40 });

  return (
    <>
      <PageHeader
        title="Templates"
        description="Reusable estimate structures for the jobs you quote most often."
        actions={<ButtonLink variant="primary" href={path("/estimates/new")}>New estimate from template</ButtonLink>}
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search templates…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[{ key: "category", label: "Category", options: optionsFrom(Array.from(new Set(rows.map((r) => r.category)))) }]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-20" /></Card>)
          : rows.map((template) => (
              <Card key={template.id} className="flex flex-col p-4 transition-colors hover:border-strongline">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold">{template.name}</p>
                  <Badge>{template.category}</Badge>
                </div>
                <p className="num mt-1 text-sm text-muted">
                  {template.sections} sections · {template.items} items · used {template.uses} times
                </p>
                <p className="num mt-3 text-3xl font-semibold">{formatMoney(template.typicalValue, tenant.currency, 0)}</p>
                <p className="text-xs text-subtle">typical value</p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-3">
                  <span className="num text-xs text-subtle">Updated {formatDate(template.updatedAt)}</span>
                  <ButtonLink size="sm" variant="primary" href={path(`/estimates/new?template=${template.id}`)}>Use template</ButtonLink>
                </div>
              </Card>
            ))}
      </div>

      {!loading && rows.length === 0 ? (
        <Card><EmptyState icon={LayoutTemplate} title="No templates yet" description="Save a completed estimate as a template to reuse its structure." /></Card>
      ) : null}
    </>
  );
}
