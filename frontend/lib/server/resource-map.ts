/** Frontend resource name -> Spring API path. The only place the two vocabularies meet. */
export const RESOURCE_PATHS = {
  clients: "/clients",
  leads: "/leads",
  projects: "/projects",
  estimates: "/estimates",
  quotations: "/quotations",
  contracts: "/contracts",
  variations: "/variations",
  invoices: "/invoices",
  payments: "/payments",
  expenses: "/expenses",
  materials: "/materials",
  labour: "/labour",
  equipment: "/equipment",
  assemblies: "/assemblies",
  suppliers: "/suppliers",
  templates: "/templates",
  documents: "/documents",
  activity: "/activity",
  audit: "/audit",
  insights: "/insights",
  dashboardCharts: "/dashboard-charts",
  moduleRecords: "/module-records",
  taxRates: "/tax-rates",
  notifications: "/notifications",
  team: "/team"
} as const;

export type ResourceKey = keyof typeof RESOURCE_PATHS;

export function isResource(value: string): value is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCE_PATHS, value);
}
