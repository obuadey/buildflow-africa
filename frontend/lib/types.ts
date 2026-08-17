export type Role = "OWNER" | "ADMIN" | "ESTIMATOR" | "PROJECT_MANAGER" | "ACCOUNTANT" | "STAFF" | "VIEWER";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  region: string;
  city: string;
  currency: string;
  initials: string;
  tin: string;
  plan: string;
};

export type Membership = { tenantSlug: string; role: Role };

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  memberships: Membership[];
};

export type Client = {
  id: string;
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  company?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  region: string;
  city: string;
  revenue: number;
  outstanding: number;
  projects: number;
  createdAt: string;
  notes?: string;
};

export type LeadStage = "NEW" | "CONTACTED" | "SITE_VISIT" | "ESTIMATING" | "QUOTED" | "NEGOTIATING" | "WON" | "LOST";

export type Lead = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  stage: LeadStage;
  value: number;
  source: string;
  owner: string;
  region: string;
  createdAt: string;
  nextAction: string;
};

export type ProjectStatus = "DRAFT" | "ESTIMATING" | "QUOTED" | "APPROVED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type Health = "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";

export type Project = {
  id: string;
  reference: string;
  name: string;
  clientId: string;
  clientName: string;
  type: string;
  location?: string;
  region: string;
  city: string;
  description?: string;
  status: ProjectStatus;
  health: Health;
  risk?: string;
  budget?: number;
  contractValue: number;
  cost: number;
  invoiced: number;
  paid: number;
  completion: number;
  manager: string;
  startDate: string;
  endDate: string;
};

export type EstimateItemKind = "MATERIAL" | "LABOUR" | "EQUIPMENT" | "SUBCONTRACTOR";

export type EstimateItem = {
  id: string;
  description: string;
  category: string;
  kind: EstimateItemKind;
  quantity: number;
  unit: string;
  rate: number;
  waste: number;
  markup: number;
};

export type EstimateSection = { id: string; name: string; items: EstimateItem[] };

export type EstimateStatus = "DRAFT" | "READY" | "QUOTED" | "APPROVED" | "REJECTED" | "ARCHIVED";

export type Estimate = {
  id: string;
  reference: string;
  title: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  status: EstimateStatus;
  estimator: string;
  createdAt: string;
  updatedAt: string;
  overheadPct: number;
  contingencyPct: number;
  profitPct: number;
  taxPct: number;
  discount: number;
  /** Calculated server-side and sent with every estimate, so a list never recomputes them. */
  directCost: number;
  overhead: number;
  contingency: number;
  profit: number;
  tax: number;
  total: number;
  /** Line counts, sent with every estimate so a list never has to load the sheet itself. */
  positions: number;
  pricedPositions: number;
  sections: EstimateSection[];
};

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "NEGOTIATING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type Quotation = {
  id: string;
  reference: string;
  estimateId: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  amount: number;
  cost: number;
  status: QuoteStatus;
  version: number;
  sentAt?: string;
  viewedAt?: string;
  views: number;
  expiry: string;
  owner: string;
  token: string;
  createdAt: string;
};

export type Contract = {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  clientName: string;
  quotationId: string;
  original: number;
  variations: number;
  value: number;
  retentionPct: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED" | "SUSPENDED";
  milestones: { name: string; percent: number; amount: number; status: "PENDING" | "INVOICED" | "PAID" }[];
};

export type Variation = {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  title: string;
  amount: number;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  createdAt: string;
  requestedBy: string;
};

export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

export type Invoice = {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  type: "DEPOSIT" | "PROGRESS" | "MILESTONE" | "VARIATION" | "FINAL";
  total: number;
  paid: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
};

export type Payment = {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientName: string;
  projectName: string;
  method: "BANK_TRANSFER" | "CASH" | "MOBILE_MONEY" | "CHEQUE" | "CARD" | "OTHER";
  amount: number;
  date: string;
  recordedBy: string;
  reference: string;
};

export type Expense = {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  supplierId?: string;
  category: "MATERIALS" | "LABOUR" | "EQUIPMENT" | "TRANSPORT" | "SUBCONTRACTOR" | "FUEL" | "SITE" | "MISC";
  vendor: string;
  amount: number;
  date: string;
  receipt: boolean;
  recordedBy: string;
  notes?: string;
  hasReceiptFile?: boolean;
};

export type Material = {
  id: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  cost: number;
  sellingRate: number;
  supplierId: string;
  supplierName: string;
  location: string;
  updatedAt: string;
  vat: boolean;
  source: "TENANT" | "SUPPLIER" | "REGIONAL" | "NATIONAL";
};

export type LabourRate = {
  id: string;
  trade: string;
  unit: string;
  rate: number;
  region: string;
  updatedAt: string;
  crewSize: number;
};

export type Equipment = {
  id: string;
  name: string;
  unit: string;
  hireRate: number;
  supplierName: string;
  transport: number;
  operatorCost: number;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  whatsapp: string;
  email: string;
  region: string;
  city: string;
  categories: string[];
  terms: string;
  spend: number;
  items: number;
  rating: number;
};

export type Template = {
  id: string;
  name: string;
  category: string;
  sections: number;
  items: number;
  typicalValue: number;
  uses: number;
  updatedAt: string;
};

export type ActivityChannel = "PROJECTS" | "FINANCE" | "SALES" | "TEAM";

export type Activity = {
  id: string;
  actor: string;
  channel: ActivityChannel;
  text: string;
  entity?: string;
  href?: string;
  at: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
  tone: "success" | "warning" | "danger" | "info";
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  lastActive: string;
};

export type Insight = {
  id: string;
  tone: "warning" | "danger" | "positive" | "ai";
  title: string;
  detail: string;
  action: string;
  href: string;
};

export type DashboardChart = {
  id: string;
  scope: "finance" | string;
  title: string;
  chartType: "number" | "bar" | "donut" | "line" | "area";
  dataset: "invoices" | "payments" | "expenses" | "projects";
  measure: string;
  groupBy: string;
  aggregation: "sum" | "count" | "avg" | "min" | "max";
  dateField?: string;
  statusFilter?: string;
  projectFilter?: string;
  limitCount: number;
  sortDir: "asc" | "desc";
  stacked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConstructionModuleRecord = {
  id: string;
  module: "accommodation";
  title: string;
  projectId: string;
  projectName: string;
  source: "BIM" | "DWG" | "PDF" | "BOQ" | "FIELD" | "MODEL" | "SYSTEM";
  type: string;
  status: string;
  priority?: "Low" | "Normal" | "High";
  owner: string;
  dueDate?: string;
  value?: number;
  quantity?: number;
  unit?: string;
  linkedRecord?: string;
  details: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  period: { from: string; to: string; label: string };
  currency: string;
  kpis: {
    revenue: { value: number; delta: number };
    outstanding: { value: number; count: number };
    activeProjects: { value: number; behind: number };
    winRate: { value: number; delta: number };
    grossProfit: { value: number; margin: number };
    cashCollected: { value: number; delta: number };
  };
  trend: { month: string; revenue: number; cost: number; profit: number }[];
  cashflow: { in: number; out: number; net: number; series: { month: string; in: number; out: number }[] };
  pipeline: { stage: QuoteStatus; count: number; value: number }[];
  health: { onTrack: number; atRisk: number; delayed: number; completed: number };
};

export type SearchGroup = {
  group: string;
  items: { id: string; title: string; subtitle: string; href: string; meta?: string }[];
};
