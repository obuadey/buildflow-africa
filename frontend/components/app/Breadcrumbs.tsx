"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { tenantPath } from "../../lib/tenant";
import { useTenantContext } from "./TenantProvider";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard", activity: "Activity", leads: "Leads", clients: "Clients", projects: "Projects",
  estimates: "Estimates", quotations: "Quotations", contracts: "Contracts", variations: "Variations",
  invoices: "Invoices", payments: "Payments", expenses: "Expenses",
  labour: "Labour", equipment: "Equipment",
  templates: "Templates", settings: "Settings",
  users: "Team", roles: "Roles", taxes: "Tax", numbering: "Numbering",
  notifications: "Notifications", billing: "Billing", security: "Security",
  new: "New"
};

export function Breadcrumbs() {
  const { tenant } = useTenantContext();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1);

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm text-muted md:flex">
      <Link href={tenantPath(tenant.slug, "/dashboard")} className="shrink-0 truncate font-medium text-fg hover:text-accent">
        {tenant.name}
      </Link>
      {segments.map((segment, i) => {
        const href = tenantPath(tenant.slug, `/${segments.slice(0, i + 1).join("/")}`);
        const last = i === segments.length - 1;
        const label = LABELS[segment] ?? segment.toUpperCase();
        return (
          <span key={href} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
            {last ? (
              <span className="truncate text-fg" aria-current="page">{label}</span>
            ) : (
              <Link href={href} className="truncate hover:text-accent">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
