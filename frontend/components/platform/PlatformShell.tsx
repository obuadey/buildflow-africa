"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Building2, Flag, Gauge, Library, Megaphone, ScrollText, ShieldCheck, Users
} from "lucide-react";
import { LogoMark } from "../brand/Logo";
import { Badge } from "../ui/Badge";
import { humanize } from "../../lib/format";

const NAV = [
  { href: "/platform", label: "Overview", icon: Gauge },
  { href: "/platform/tenants", label: "Companies", icon: Building2 },
  { href: "/platform/users", label: "Users", icon: Users },
  { href: "/platform/prices", label: "Cost library", icon: Library },
  { href: "/platform/audit", label: "Audit log", icon: ScrollText },
  { href: "/platform/flags", label: "Feature flags", icon: Flag },
  { href: "/platform/announcements", label: "Announcements", icon: Megaphone },
  { href: "/platform/health", label: "System health", icon: Activity }
];

export function PlatformShell({
  operator, children
}: {
  operator: { name: string; email: string; platformRole: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col border-r border-hairline bg-surface lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-hairline px-3">
          <LogoMark size={24} />
          <span className="text-sm font-semibold tracking-tight">Platform console</span>
        </div>
        <nav aria-label="Platform" className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/platform"
                ? pathname === "/platform"
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-base transition-colors ${
                      active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-sunken hover:text-fg"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-hairline p-3">
          <p className="truncate text-sm font-medium">{operator.name}</p>
          <p className="truncate text-xs text-muted">{operator.email}</p>
          <Badge tone="brand" className="mt-2">{humanize(operator.platformRole.replace("PLATFORM_", ""))}</Badge>
          <Link href="/" className="mt-3 block text-xs text-muted hover:text-fg">Leave console</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface/95 px-4 backdrop-blur">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium">Operator console</p>
          <p className="hidden text-sm text-muted sm:block">
            Every action here is written to the platform audit trail.
          </p>
          <nav aria-label="Platform mobile" className="ml-auto flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded px-2 py-1 text-xs text-muted hover:text-fg">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
