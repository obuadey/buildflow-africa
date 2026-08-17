"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { TenantProvider, type TenantContextValue } from "./TenantProvider";
import { MOBILE_NAV } from "../../lib/nav";
import { tenantPath } from "../../lib/tenant";
import { IconButton } from "../ui/Button";

export function AppShell({ value, children }: { value: TenantContextValue; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("epa.sidebar") === "collapsed");
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      window.localStorage.setItem("epa.sidebar", c ? "expanded" : "collapsed");
      return !c;
    });
  }, []);

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(true); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") { e.preventDefault(); router.push(tenantPath(value.tenant.slug, "/estimates/new")); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, value.tenant.slug]);

  return (
    <TenantProvider value={value}>
      <div className="flex min-h-screen bg-canvas">
        <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </aside>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 animate-fade-in bg-granite-900/40" onClick={() => setMobileNavOpen(false)} aria-hidden />
            <div className="relative h-full w-[248px] animate-slide-up">
              <Sidebar collapsed={false} onToggle={() => setMobileNavOpen(false)} onNavigate={() => setMobileNavOpen(false)} />
              <IconButton label="Close navigation" className="absolute -right-10 top-3 bg-surface" onClick={() => setMobileNavOpen(false)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenSidebar={() => setMobileNavOpen(true)}
          />
          <main data-tour="main-content" className="w-full min-w-0 flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-8 lg:pt-5">{children}</main>
        </div>

        <MobileTabBar slug={value.tenant.slug} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </TenantProvider>
  );
}

function MobileTabBar({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-hairline bg-surface/95 backdrop-blur lg:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const href = tenantPath(slug, item.href);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-accent" : "text-muted"}`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href={tenantPath(slug, "/estimates/new")}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted"
      >
        <Plus className="h-[18px] w-[18px]" />
        Create
      </Link>
      <Link
        href={tenantPath(slug, "/settings")}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" />
        More
      </Link>
    </nav>
  );
}
