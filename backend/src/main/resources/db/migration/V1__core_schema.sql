create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null,
  phone varchar(40),
  email varchar(160),
  address text,
  region varchar(80),
  city varchar(80),
  website varchar(160),
  tin varchar(80),
  vat_registered boolean not null default false,
  default_currency varchar(3) not null default 'GHS',
  default_markup numeric(9,4) not null default 0,
  default_overhead numeric(9,4) not null default 0,
  default_profit_margin numeric(9,4) not null default 0,
  estimate_validity_days integer not null default 30,
  payment_terms text,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  full_name varchar(160) not null,
  email varchar(160) not null,
  password_hash varchar(255) not null,
  enabled boolean not null default true,
  email_verified boolean not null default false,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name varchar(80) not null,
  unique (tenant_id, name)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code varchar(120) not null unique
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  client_type varchar(30) not null,
  name varchar(160) not null,
  company_name varchar(160),
  phone varchar(40),
  whatsapp varchar(40),
  email varchar(160),
  address text,
  region varchar(80),
  city varchar(80),
  tax_information text,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_clients_tenant_name on clients(tenant_id, name);

create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  client_id uuid references clients(id),
  project_number varchar(40) not null,
  name varchar(180) not null,
  project_type varchar(80),
  location text,
  region varchar(80),
  city varchar(80),
  description text,
  start_date date,
  expected_completion_date date,
  status varchar(40) not null default 'DRAFT',
  budget numeric(19,4),
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, project_number)
);
create index idx_projects_tenant_status on projects(tenant_id, status);

create table material_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name varchar(120) not null,
  unique (tenant_id, name)
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name varchar(160) not null,
  contact_person varchar(160),
  phone varchar(40),
  whatsapp varchar(40),
  email varchar(160),
  address text,
  region varchar(80),
  city varchar(80),
  payment_terms text,
  notes text,
  created_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  category_id uuid references material_categories(id),
  supplier_id uuid references suppliers(id),
  name varchar(180) not null,
  description text,
  brand varchar(120),
  unit varchar(40) not null,
  purchase_price numeric(19,4) not null default 0,
  selling_rate numeric(19,4) not null default 0,
  location varchar(120),
  effective_date date not null default current_date,
  vat_applicable boolean not null default false,
  active boolean not null default true,
  notes text,
  price_source varchar(40) not null default 'TENANT',
  created_at timestamptz not null default now()
);
create index idx_materials_tenant_active on materials(tenant_id, active);

create table labour_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  trade varchar(120) not null,
  unit varchar(40) not null,
  rate numeric(19,4) not null,
  effective_date date not null default current_date,
  active boolean not null default true
);

create table estimates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  project_id uuid references projects(id),
  estimate_number varchar(40) not null,
  title varchar(180) not null,
  status varchar(40) not null default 'DRAFT',
  currency varchar(3) not null default 'GHS',
  overhead_percent numeric(9,4) not null default 0,
  contingency_percent numeric(9,4) not null default 0,
  profit_percent numeric(9,4) not null default 0,
  tax_percent numeric(9,4) not null default 0,
  discount_amount numeric(19,4) not null default 0,
  direct_cost numeric(19,4) not null default 0,
  overhead_amount numeric(19,4) not null default 0,
  contingency_amount numeric(19,4) not null default 0,
  profit_amount numeric(19,4) not null default 0,
  tax_amount numeric(19,4) not null default 0,
  total_amount numeric(19,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, estimate_number)
);
create index idx_estimates_tenant_status on estimates(tenant_id, status);

create table estimate_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  estimate_id uuid not null references estimates(id) on delete cascade,
  name varchar(160) not null,
  sort_order integer not null default 0,
  subtotal numeric(19,4) not null default 0
);

create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  estimate_id uuid not null references estimates(id) on delete cascade,
  section_id uuid not null references estimate_sections(id) on delete cascade,
  description text not null,
  category varchar(120),
  quantity numeric(19,4) not null,
  unit varchar(40) not null,
  unit_cost numeric(19,4) not null default 0,
  waste_percent numeric(9,4) not null default 0,
  labour_cost numeric(19,4) not null default 0,
  equipment_cost numeric(19,4) not null default 0,
  subcontractor_cost numeric(19,4) not null default 0,
  markup_percent numeric(9,4) not null default 0,
  tax_percent numeric(9,4) not null default 0,
  total numeric(19,4) not null default 0,
  sort_order integer not null default 0
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  estimate_id uuid not null references estimates(id),
  quote_number varchar(40) not null,
  version integer not null default 1,
  status varchar(40) not null default 'DRAFT',
  client_total numeric(19,4) not null,
  valid_until date,
  terms text,
  created_at timestamptz not null default now(),
  unique (tenant_id, quote_number, version)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid references users(id),
  action varchar(120) not null,
  entity_type varchar(80) not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  ip_address varchar(80),
  created_at timestamptz not null default now()
);

create table ai_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid references users(id),
  request_type varchar(80) not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

