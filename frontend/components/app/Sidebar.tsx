"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, Search, Settings, Users, X
} from "lucide-react";
import { Logo, LogoMark } from "../brand/Logo";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../ui/Menu";
import { Tooltip } from "../ui/Misc";
import { SIDENAV, type NavItem } from "../../lib/nav";
import { tenantPath } from "../../lib/tenant";
import { useTenantContext } from "./TenantProvider";

export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const { tenant, tenants, role } = useTenantContext();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDENAV.map((group) => [group.label, Boolean(group.defaultOpen)]))
  );

  const groups = useMemo(
    () =>
      SIDENAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => (!item.roles || item.roles.includes(role)) && matchesQuery(item, group.label, query))
      })).filter((group) => group.items.length || !query.trim()),
    [query, role]
  );

  const isActive = (href: string) => {
    const full = tenantPath(tenant.slug, href);
    const base = full.split("?")[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  if (collapsed) {
    return (
      <div data-tour="sidebar" className="flex h-full w-[64px] flex-col border-r border-hairline bg-surface">
        <div className="flex h-14 items-center justify-center border-b border-hairline">
          <Link href={tenantPath(tenant.slug, "/dashboard")} aria-label="BuildFlow Africa home"><LogoMark size={25} /></Link>
        </div>
        <div className="border-b border-hairline px-2 py-2">
          <Tooltip label="Search" side="right">
            <button type="button" onClick={() => onToggle()} className="flex h-9 w-full items-center justify-center rounded-lg border border-hairline bg-sunken/60 text-slate-700 transition hover:border-strongline hover:bg-surface hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              <Search className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Main">
          {groups.flatMap((group) => group.items).slice(0, 18).map((item) => {
            const Icon = item.icon;
            const link = (
              <Link
                href={tenantPath(tenant.slug, item.href)}
                onClick={onNavigate}
                className={`mb-1 flex h-9 items-center justify-center transition-colors ${
                  isActive(item.href) ? "rounded-none bg-info/12 text-info shadow-[inset_3px_0_0_rgb(var(--info))]" : "rounded-lg text-slate-700 hover:bg-sunken hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </Link>
            );
            return <Tooltip key={item.href} label={item.label}>{link}</Tooltip>;
          })}
        </nav>
        <div className="border-t border-hairline p-2">
          {[Settings, Users].map((Icon, index) => (
            <Tooltip key={index} label={["Settings", "Users"][index]}>
              <button
                type="button"
                className="mb-1 flex h-9 w-full items-center justify-center rounded-lg text-slate-700 transition hover:bg-sunken hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </button>
            </Tooltip>
          ))}
          <button onClick={onToggle} className="flex h-9 w-full items-center justify-center rounded-lg border border-hairline bg-raised text-slate-700 shadow-soft hover:bg-sunken hover:text-slate-950 dark:text-slate-300 dark:hover:text-white" aria-label="Expand sidebar">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="sidebar" className="flex h-full w-[256px] flex-col border-r border-hairline bg-surface">
      <div className="flex h-14 items-center border-b border-hairline px-3.5">
        <Link href={tenantPath(tenant.slug, "/dashboard")} aria-label="BuildFlow Africa home">
          <Logo size={22} />
        </Link>
      </div>

      <div className="border-b border-hairline p-2.5">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-sunken/55 px-2.5 text-sm transition focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/15">
          <Search className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent font-medium text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400" placeholder="Search" />
          <kbd className="rounded border border-hairline px-1 text-2xs font-semibold text-slate-600 dark:text-slate-300">⌘K</kbd>
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Main">
        {groups.map((group) => {
          const open = query.trim() ? true : openGroups[group.label];
          return (
            <div key={group.label} className="mb-2.5">
              <button
                type="button"
                onClick={() => setOpenGroups((state) => ({ ...state, [group.label]: !state[group.label] }))}
                className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 transition hover:bg-sunken hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <span className="h-1 w-1 rounded-full bg-info" />
                <span className="min-w-0 flex-1 truncate leading-4">{group.label}</span>
                {open ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
              </button>
              {open ? (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <li key={`${group.label}-${item.href}-${item.label}`}>
                      <SideLink item={item} active={isActive(item.href)} href={tenantPath(tenant.slug, item.href)} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <SidebarFooter tenantName={tenant.name} onToggle={onToggle} />
    </div>
  );
}

function SideLink({ item, active, href, onNavigate }: { item: NavItem; active: boolean; href: string; onNavigate?: () => void }) {
  const Icon = item.icon;
  const beta = item.href.includes("ai") || item.href.includes("builder") || item.href.includes("plan-room") || item.href.includes("cad-bim");
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-8 items-center gap-2.5 px-2.5 py-1.5 text-[13px] leading-5 transition-colors ${
        active ? "rounded-none bg-info/12 font-bold text-info shadow-[inset_3px_0_0_rgb(var(--info))]" : "rounded-lg font-semibold text-slate-800 hover:bg-sunken/80 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-info" : "text-slate-600 dark:text-slate-300"}`} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {beta ? <span className="rounded bg-sunken px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Beta</span> : null}
    </Link>
  );
}

function SidebarFooter({ tenantName, onToggle }: { tenantName: string; onToggle: () => void }) {
  const { tenant, tenants } = useTenantContext();
  return (
    <div data-tour="tenant-switcher" className="relative border-t border-hairline bg-surface p-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        <FooterButton href={tenantPath(tenant.slug, "/settings")} icon={Settings} label="Settings" />
        <FooterButton href={tenantPath(tenant.slug, "/settings/users")} icon={Users} label="Users" />
      </div>

      <Menu
        width="w-60"
        align="left"
        placement="top"
        trigger={({ toggle }) => (
          <button onClick={toggle} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-hairline bg-raised px-2.5 py-2 text-left shadow-soft transition hover:border-strongline hover:bg-sunken">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-info/10 text-info"><BuildingIcon /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{tenantName}</span>
            <X className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Switch company</MenuLabel>
            {tenants.map((t) => (
              <Link key={t.slug} href={tenantPath(t.slug, "/dashboard")} onClick={close} className="block">
                <MenuItem icon={t.slug === tenant.slug ? Check : undefined}>{t.name}</MenuItem>
              </Link>
            ))}
            <MenuSeparator />
            <Link href="/onboarding" onClick={close}><MenuItem icon={Plus}>Create company</MenuItem></Link>
          </>
        )}
      </Menu>

      <button onClick={onToggle} className="absolute -right-3 top-1/2 flex h-11 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-surface text-slate-700 shadow-raised hover:bg-sunken hover:text-slate-950 dark:text-slate-300 dark:hover:text-white" aria-label="Collapse sidebar">
        <ChevronsLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FooterButton({ href, icon: Icon, label, external }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="flex h-8 items-center gap-2 rounded-md border border-hairline px-2 text-xs font-semibold text-slate-800 hover:bg-sunken hover:text-slate-950 dark:text-slate-200 dark:hover:text-white">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function FooterAction({ onClick, icon: Icon, label }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-2 rounded-md border border-hairline px-2 text-left text-xs font-semibold text-slate-800 hover:bg-sunken hover:text-slate-950 dark:text-slate-200 dark:hover:text-white">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function matchesQuery(item: NavItem, group: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${group} ${item.label} ${item.href}`.toLowerCase().includes(q);
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <rect x="3" y="2.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 5h1M9.5 5h1M5.5 8h1M9.5 8h1M5.5 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
