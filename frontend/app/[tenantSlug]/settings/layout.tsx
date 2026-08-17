"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "../../../components/app/PageHeader";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { SETTINGS_NAV } from "../../../lib/nav";
import { tenantPath } from "../../../lib/tenant";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenantContext();
  const pathname = usePathname();

  return (
    <>
      <PageHeader title="Settings" description={`Company configuration for ${tenant.name}.`} />
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings" className="lg:sticky lg:top-[72px] lg:h-fit">
          <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
            {SETTINGS_NAV.map((item) => {
              const href = tenantPath(tenant.slug, item.href);
              const active = pathname === href;
              return (
                <li key={item.href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-md px-2.5 py-1.5 text-base transition-colors ${
                      active ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-sunken hover:text-fg"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 space-y-3">{children}</div>
      </div>
    </>
  );
}
