import {
  Sparkles,
  Activity, Boxes, Briefcase,
  Calculator,
  CreditCard, Database, FileSignature,
  FileSpreadsheet, FileText, FolderOpen,
  LayoutDashboard, ListChecks,
  Receipt, Settings, ShieldCheck,
  TableProperties, Truck, UserRound,
  Users, Wallet
} from "lucide-react";
import type { Role } from "./types";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  badge?: "outstanding" | "pending";
};

export type NavGroup = { label: string; items: NavItem[] };
export type SideNavGroup = NavGroup & { defaultOpen?: boolean };

const ALL: Role[] = ["OWNER", "ADMIN", "ESTIMATOR", "PROJECT_MANAGER", "ACCOUNTANT", "STAFF", "VIEWER"];
const FINANCE: Role[] = ["OWNER", "ADMIN", "ACCOUNTANT", "PROJECT_MANAGER"];
const ADMIN: Role[] = ["OWNER", "ADMIN"];

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
      { href: "/activity", label: "Activity", icon: Activity, roles: ALL }
    ]
  },
  {
    label: "Sales",
    items: [
      { href: "/leads", label: "Leads", icon: ListChecks, roles: ALL },
      { href: "/clients", label: "Clients", icon: Users, roles: ALL },
      { href: "/estimates", label: "Estimates", icon: Calculator, roles: ALL },
      { href: "/quick-estimate", label: "Quick estimate", icon: Sparkles, roles: ALL },
      { href: "/quotations", label: "Quotations", icon: FileText, roles: ALL },
      { href: "/contracts", label: "Contracts", icon: FileSignature, roles: ALL },
      { href: "/invoices", label: "Invoices", icon: Receipt, roles: FINANCE, badge: "outstanding" },
      { href: "/payments", label: "Payments", icon: Wallet, roles: FINANCE }
    ]
  },
  {
    label: "Projects",
    items: [
      { href: "/projects", label: "Projects", icon: Briefcase, roles: ALL },
      { href: "/estimates", label: "Estimates", icon: Calculator, roles: ALL },
      { href: "/quick-estimate", label: "Quick estimate", icon: Sparkles, roles: ALL },
      { href: "/quotations", label: "Quotations", icon: FileText, roles: ALL },
      { href: "/contracts", label: "Contracts", icon: FileSignature, roles: ALL },
      { href: "/variations", label: "Variations", icon: FileSpreadsheet, roles: ALL }
    ]
  },
  {
    label: "Finance",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt, roles: FINANCE, badge: "outstanding" },
      { href: "/payments", label: "Payments", icon: Wallet, roles: FINANCE },
      { href: "/expenses", label: "Expenses", icon: CreditCard, roles: FINANCE }
    ]
  },
  {
    label: "Cost Data",
    items: [
      { href: "/cost-database", label: "Cost Database", icon: Database, roles: ALL },
      { href: "/resource-catalog", label: "Resource Catalog", icon: Boxes, roles: ALL }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/templates", label: "Templates", icon: FolderOpen, roles: ALL }
    ]
  },
  {
    label: "Administration",
    items: [
      { href: "/settings/users", label: "Team", icon: UserRound, roles: ADMIN },
      { href: "/settings/roles", label: "Roles & permissions", icon: ShieldCheck, roles: ADMIN },
      { href: "/settings", label: "Company settings", icon: Settings, roles: ADMIN }
    ]
  }
];

export const SIDENAV: SideNavGroup[] = [
  {
    label: "Overview",
    defaultOpen: true,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
      { href: "/module/finance", label: "Financial", icon: Wallet, roles: FINANCE },
      { href: "/activity", label: "Activity", icon: Activity, roles: ALL },
      { href: "/projects", label: "Projects", icon: FolderOpen, roles: ALL }
    ]
  },
  {
    label: "Sales",
    defaultOpen: true,
    items: [
      { href: "/leads", label: "Leads", icon: ListChecks, roles: ALL },
      { href: "/clients", label: "Clients", icon: Users, roles: ALL },
    ]
  },
  {
    label: "Projects",
    items: [
      { href: "/estimates", label: "Estimates", icon: TableProperties, roles: ALL },
      { href: "/quick-estimate", label: "Quick estimate", icon: Sparkles, roles: ALL },
      { href: "/quotations", label: "Quotations", icon: FileText, roles: ALL },
      { href: "/contracts", label: "Contracts", icon: FileSignature, roles: ALL },
      { href: "/variations", label: "Variations", icon: FileSpreadsheet, roles: ALL }
    ]
  },
  {
    label: "Finance",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt, roles: FINANCE, badge: "outstanding" },
      { href: "/payments", label: "Payments", icon: Wallet, roles: FINANCE },
      { href: "/expenses", label: "Expenses", icon: CreditCard, roles: FINANCE }
    ]
  },
  {
    label: "Cost Data",
    items: [
      { href: "/cost-database", label: "Cost Database", icon: Database, roles: ALL },
      { href: "/resource-catalog", label: "Resource Catalog", icon: Boxes, roles: ALL }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/templates", label: "Templates", icon: FolderOpen, roles: ALL },
      { href: "/documents", label: "Documents", icon: FileText, roles: ALL }
    ]
  },
  {
    label: "Resources & Assets",
    items: [
      { href: "/equipment", label: "Equipment & Fleet", icon: Truck, roles: ALL },
      { href: "/labour", label: "Resources & Crew", icon: Users, roles: ALL }
    ]
  }
];

export function visibleNav(role: Role): NavGroup[] {
  return NAV.map((group) => ({ ...group, items: group.items.filter((i) => !i.roles || i.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}

export const SETTINGS_NAV = [
  { href: "/settings", label: "Company" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/roles", label: "Roles" },
  { href: "/settings/taxes", label: "Tax" },
  { href: "/settings/numbering", label: "Numbering" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/audit", label: "Audit log" }
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/estimates", label: "Estimates", icon: Calculator },
  { href: "/invoices", label: "Invoices", icon: Receipt }
];
