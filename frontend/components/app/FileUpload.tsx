"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "../ui/Button";
import { useTenantContext } from "./TenantProvider";

/**
 * Uploads a file to the documents endpoint. The request is multipart and goes through the tenant
 * proxy, so the browser never sees a storage credential.
 */
export function FileUpload({
  projectId, kind = "PLAN", label = "Upload document", accept = ".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.docx",
  variant = "primary", size = "md", onUploaded
}: {
  projectId?: string;
  kind?: "PLAN" | "BOQ" | "QUOTE" | "INVOICE" | "RECEIPT" | "PHOTO" | "CONTRACT";
  label?: string;
  accept?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  onUploaded?: (document: { id: string; name: string }) => void;
}) {
  const { tenant } = useTenantContext();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const search = new URLSearchParams({ kind });
      if (projectId) search.set("projectId", projectId);
      const response = await fetch(`/api/t/${tenant.slug}/documents/upload?${search}`, { method: "POST", body });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        setError(problem.message ?? "That file could not be uploaded.");
        return;
      }
      onUploaded?.(await response.json());
    } catch {
      setError("The upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) send(file);
        }}
      />
      <Button variant={variant} size={size} onClick={() => input.current?.click()} disabled={busy}>
        <Upload className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} /> {busy ? "Uploading…" : label}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
