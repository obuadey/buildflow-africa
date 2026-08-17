"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Building2, Calculator, CornerDownLeft, CreditCard, FileText, ListChecks, Receipt,
  Search, UserPlus, Users, Wallet
} from "lucide-react";
import { useSearch } from "../../lib/client";
import { tenantPath } from "../../lib/tenant";
import { useTenantContext } from "./TenantProvider";
import { KeyHint } from "../ui/Misc";
import { SegmentedControl } from "../ui/Field";
import { StatusBadge } from "../ui/Badge";

type Command = { id: string; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; href: string };

const COMMANDS: Command[] = [
  { id: "c1", label: "Create project", hint: "Projects", icon: Building2, href: "/projects?new=1" },
  { id: "c2", label: "Create estimate", hint: "Estimates", icon: Calculator, href: "/estimates/new" },
  { id: "c3", label: "Create quotation", hint: "Quotations", icon: FileText, href: "/quotations?new=1" },
  { id: "c4", label: "Add client", hint: "Clients", icon: Users, href: "/clients?new=1" },
  { id: "c5", label: "Add lead", hint: "Leads", icon: ListChecks, href: "/leads?new=1" },
  { id: "c7", label: "Record payment", hint: "Payments", icon: Wallet, href: "/payments?new=1" },
  { id: "c8", label: "Create invoice", hint: "Invoices", icon: Receipt, href: "/invoices?new=1" },
  { id: "c9", label: "Record expense", hint: "Expenses", icon: CreditCard, href: "/expenses?new=1" },
  { id: "c11", label: "Invite team member", hint: "Administration", icon: UserPlus, href: "/settings/users?invite=1" },
  { id: "c12", label: "Open dashboard", hint: "Overview", icon: ArrowRight, href: "/dashboard" }
];

const SCOPES = [
  { value: "all", label: "All" },
  { value: "projects", label: "Projects" },
  { value: "clients", label: "Clients" },
  { value: "estimates", label: "Estimates" },
  { value: "quotations", label: "Quotes" },
  { value: "invoices", label: "Invoices" }
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { groups, loading } = useSearch(query, scope);

  const commandMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS.slice(0, 6);
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
  }, [query]);

  const flat = useMemo(() => {
    const results = groups.flatMap((g) => g.items.map((i) => ({ kind: "record" as const, group: g.group, ...i })));
    const commands = commandMatches.map((c) => ({ kind: "command" as const, group: "Actions", id: c.id, title: c.label, subtitle: c.hint, href: c.href, meta: undefined as string | undefined }));
    return [...results, ...commands];
  }, [groups, commandMatches]);

  useEffect(() => { setCursor(0); }, [query, scope]);
  useEffect(() => {
    if (open) { setQuery(""); setScope("all"); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter") {
        const item = flat[cursor];
        if (item) { e.preventDefault(); router.push(tenantPath(tenant.slug, item.href)); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, cursor, onClose, router, tenant.slug]);

  if (!open) return null;

  let index = -1;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-6">
      <div className="fixed inset-0 animate-fade-in bg-granite-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Search and commands"
        className="relative mt-[8vh] w-full max-w-2xl animate-slide-up overflow-hidden rounded-xl border border-hairline bg-surface shadow-overlay">
        <div className="flex items-center gap-2 border-b border-hairline px-3">
          <Search className="h-4 w-4 shrink-0 text-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, clients, estimates, quotes, invoices..."
            aria-label="Search"
            className="h-12 w-full border-0 bg-transparent text-base outline-none placeholder:text-subtle"
          />
          <KeyHint>Esc</KeyHint>
        </div>

        <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
          <SegmentedControl size="sm" value={scope} onChange={setScope} options={SCOPES} />
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {query.trim().length >= 2 && loading ? <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p> : null}

          {groups.map((group) => (
            <div key={group.group} className="mb-1">
              <p className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-subtle">{group.group}</p>
              {group.items.map((item) => {
                index += 1;
                const active = index === cursor;
                const myIndex = index;
                return (
                  <button
                    key={`${group.group}-${item.id}`}
                    onMouseEnter={() => setCursor(myIndex)}
                    onClick={() => { router.push(tenantPath(tenant.slug, item.href)); onClose(); }}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${active ? "bg-sunken" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium">{item.title}</span>
                      <span className="num block truncate text-sm text-muted">{item.subtitle}</span>
                    </span>
                    {item.meta ? <StatusBadge status={item.meta} /> : null}
                    {active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-subtle" /> : null}
                  </button>
                );
              })}
            </div>
          ))}

          {commandMatches.length ? (
            <div>
              <p className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-subtle">Actions</p>
              {commandMatches.map((command) => {
                index += 1;
                const active = index === cursor;
                const Icon = command.icon;
                const myIndex = index;
                return (
                  <button
                    key={command.id}
                    onMouseEnter={() => setCursor(myIndex)}
                    onClick={() => { router.push(tenantPath(tenant.slug, command.href)); onClose(); }}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${active ? "bg-sunken" : ""}`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted" />
                    <span className="flex-1 truncate text-base">{command.label}</span>
                    <span className="text-sm text-subtle">{command.hint}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {query.trim().length >= 2 && !loading && flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No matches for “{query}”.</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 border-t border-hairline px-3 py-2 text-sm text-subtle">
          <span className="flex items-center gap-1"><KeyHint>↑</KeyHint><KeyHint>↓</KeyHint> navigate</span>
          <span className="flex items-center gap-1"><KeyHint>↵</KeyHint> open</span>
          <span className="ml-auto">Scoped to {tenant.name}</span>
        </div>
      </div>
    </div>
  );
}
