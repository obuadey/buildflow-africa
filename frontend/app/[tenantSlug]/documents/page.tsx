"use client";

import { Download, FolderOpen, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { FileUpload } from "../../../components/app/FileUpload";
import { useListState } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { DataTable, type Column } from "../../../components/ui/DataTable";
import { Badge } from "../../../components/ui/Badge";
import { Button, ButtonLink } from "../../../components/ui/Button";
import { useList } from "../../../lib/client";
import { options, useReference } from "../../../lib/reference";
import { formatRelative, humanize } from "../../../lib/format";

type DocumentRow = {
  id: string;
  name: string;
  kind: string;
  projectId?: string;
  sizeBytes: number;
  contentType?: string;
  uploadedBy?: string;
  uploadedAt: string;
};

const KINDS = ["PLAN", "BOQ", "QUOTE", "INVOICE", "RECEIPT", "PHOTO", "CONTRACT"];

function formatSize(bytes: number) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function DocumentsPage() {
  const { tenant } = useTenantContext();
  const reference = useReference();
  const state = useListState({}, "createdAt");
  const { rows, total, pages, loading, error, refresh } = useList<DocumentRow>("documents", state.params);

  async function remove(id: string) {
    await fetch(`/api/t/${tenant.slug}/documents/${id}`, { method: "DELETE" });
    refresh();
  }

  const columns: Column<DocumentRow>[] = [
    { key: "name", header: "File", sortable: true, hideable: false, render: (d) => <span className="font-medium">{d.name}</span> },
    { key: "kind", header: "Type", render: (d) => <Badge>{humanize(d.kind)}</Badge> },
    { key: "sizeBytes", header: "Size", align: "right", sortable: true, render: (d) => formatSize(d.sizeBytes) },
    { key: "uploadedBy", header: "Uploaded by", sortable: true, render: (d) => d.uploadedBy ?? "—" },
    { key: "uploadedAt", header: "Uploaded", sortable: true, render: (d) => formatRelative(d.uploadedAt) },
    {
      key: "actions", header: "", align: "right", hideable: false,
      render: (d) => (
        <span className="flex items-center justify-end gap-1.5">
          <ButtonLink size="sm" href={`/api/t/${tenant.slug}/documents/${d.id}/download`} target="_blank">
            <Download className="h-3.5 w-3.5" /> Download
          </ButtonLink>
          <Button size="sm" onClick={() => remove(d.id)} aria-label={`Delete ${d.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Documents"
        description="Plans, bills of quantities, signed quotations, receipts and site photographs, stored against their project."
        actions={<FileUpload onUploaded={refresh} />}
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search documents…"
        values={state.filters}
        onChange={state.setFilter}
        filters={[{ key: "kind", label: "Type", options: options(reference.units.length ? KINDS : KINDS) }]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(d) => d.id}
        loading={loading}
        error={error}
        onRetry={refresh}
        total={total}
        page={state.page}
        pages={pages}
        onPage={state.setPage}
        sort={state.sort}
        dir={state.dir}
        onSort={state.onSort}
        selectable
        exportName="documents"
        empty={{
          title: "No documents yet",
          description: "Upload drawings, bills of quantities and receipts to keep project records in one place.",
          action: <FileUpload onUploaded={refresh} />
        }}
      />

      {!loading && !rows.length ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <FolderOpen className="h-4 w-4" /> Accepted formats: PDF, JPG, PNG, WebP, CSV, XLSX and DOCX, up to 25 MB.
        </p>
      ) : null}
    </>
  );
}
