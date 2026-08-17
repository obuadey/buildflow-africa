"use client";

import Link from "next/link";
import { Briefcase, Building2, FileText, Hammer, Home, ReceiptText, Settings, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/estimates", label: "Estimates", icon: Hammer },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/settings/company", label: "Settings", icon: Settings }
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-line bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">BuildFlow Africa</span>
        </div>
        <nav className="grid grid-cols-2 gap-1 p-2 lg:block">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`mb-1 flex items-center gap-2 rounded px-3 py-2 text-sm ${active ? "bg-blue-600 text-white" : "hover:bg-field"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
