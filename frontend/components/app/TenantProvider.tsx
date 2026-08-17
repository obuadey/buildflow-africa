"use client";

import { createContext, useContext } from "react";
import type { CurrentUser, Role, Tenant } from "../../lib/types";

export type TenantContextValue = {
  tenant: Tenant;
  role: Role;
  user: CurrentUser;
  tenants: (Tenant & { role: string })[];
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ value, children }: { value: TenantContextValue; children: React.ReactNode }) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const value = useContext(TenantContext);
  if (!value) throw new Error("useTenantContext must be used inside a tenant layout");
  return value;
}

export function useCurrency() {
  return useTenantContext().tenant.currency;
}
