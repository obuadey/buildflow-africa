"use client";

import Link from "next/link";
import {
  Building2, Calculator, CreditCard, FileText, HelpCircle, ListChecks, LogOut, Menu as MenuIcon,
  Moon, Plus, Receipt, Search, Settings, Sun, UserRound, Users, Wallet, ShieldCheck} from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { NotificationCenter } from "./NotificationCenter";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../ui/Menu";
import { Button, IconButton } from "../ui/Button";
import { Avatar, KeyHint } from "../ui/Misc";
import { tenantPath } from "../../lib/tenant";
import { useTenantContext } from "./TenantProvider";
import { useTheme } from "./ThemeProvider";

const CREATE_ITEMS = [
  { label: "New project", href: "/projects?new=1", icon: Building2 },
  { label: "New estimate", href: "/estimates/new", icon: Calculator },
  { label: "New quotation", href: "/quotations?new=1", icon: FileText },
  { label: "New invoice", href: "/invoices?new=1", icon: Receipt },
  { label: "New client", href: "/clients?new=1", icon: Users },
  { label: "New lead", href: "/leads?new=1", icon: ListChecks },
  { label: "New expense", href: "/expenses?new=1", icon: CreditCard },
  { label: "Record payment", href: "/payments?new=1", icon: Wallet }
];

export function TopBar({ onOpenPalette, onOpenSidebar }: {
  onOpenPalette: () => void; onOpenSidebar: () => void;
}) {
  const { tenant, user, role } = useTenantContext();
  const { resolved, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-hairline bg-surface/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:px-4">
      <IconButton label="Open navigation" className="lg:hidden" onClick={onOpenSidebar}>
        <MenuIcon className="h-4 w-4" />
      </IconButton>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <button
          data-tour="global-search"
          onClick={onOpenPalette}
          className="flex h-9 w-9 items-center justify-center rounded border border-hairline bg-surface text-muted transition-colors hover:bg-sunken md:w-[300px] md:justify-start md:gap-2 md:px-2.5 xl:w-[380px]"
          aria-label="Search"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden truncate text-sm md:inline">Search projects, clients, quotes…</span>
          <span className="ml-auto hidden items-center gap-0.5 md:flex">
            <KeyHint>⌘</KeyHint><KeyHint>K</KeyHint>
          </span>
        </button>

        <Menu
          width="w-56"
          trigger={({ toggle }) => (
            <Button data-tour="quick-create" variant="primary" onClick={toggle} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> Create
            </Button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Quick create</MenuLabel>
              {CREATE_ITEMS.map((item) => (
                <Link key={item.href} href={tenantPath(tenant.slug, item.href)} onClick={close}>
                  <MenuItem icon={item.icon}>{item.label}</MenuItem>
                </Link>
              ))}
            </>
          )}
        </Menu>

        <IconButton
          label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
        >
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </IconButton>

        <Menu
          width="w-64"
          trigger={({ toggle }) => (
            <IconButton label="Help and shortcuts" onClick={toggle} className="hidden sm:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </IconButton>
          )}
        >
          {() => (
            <div className="p-1">
              <MenuLabel>Keyboard shortcuts</MenuLabel>
              {[["Command palette", "⌘ K"], ["Search", "/"], ["New estimate", "⌘ E"], ["Close overlay", "Esc"]].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span>{label}</span>
                  <KeyHint>{key}</KeyHint>
                </div>
              ))}
              <MenuSeparator />
              <Link href="/contact"><MenuItem>Contact support</MenuItem></Link>
            </div>
          )}
        </Menu>

        <div data-tour="notifications">
          <NotificationCenter />
        </div>

        <Menu
          width="w-60"
          trigger={({ toggle }) => (
            <button data-tour="profile-menu" onClick={toggle} aria-label="Account menu" className="flex items-center gap-2 rounded p-0.5 hover:bg-sunken">
              <Avatar name={user.name} initials={user.initials} size={28} />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2 py-2">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted">{user.email}</p>
                <p className="mt-1 text-2xs uppercase tracking-wider text-subtle">{role.replace("_", " ")} · {tenant.name}</p>
              </div>
              <MenuSeparator />
              <Link href={tenantPath(tenant.slug, "/settings")} onClick={close}><MenuItem icon={Settings}>Company settings</MenuItem></Link>
              <Link href={tenantPath(tenant.slug, "/settings/users")} onClick={close}><MenuItem icon={UserRound}>Team</MenuItem></Link>
              <Link href="/platform" onClick={close}><MenuItem icon={ShieldCheck}>Platform console</MenuItem></Link>
              <MenuSeparator />
              <MenuItem
                icon={LogOut}
                onClick={async () => {
                  close();
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                Sign out
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
