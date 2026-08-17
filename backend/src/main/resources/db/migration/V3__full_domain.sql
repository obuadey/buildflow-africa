-- Full operating domain: memberships, sales pipeline, delivery, cash, cost library and platform config.

-- ---------------------------------------------------------------- tenant identity & config
alter table tenants add column if not exists slug varchar(80);
update tenants set slug = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g') where slug is null;
update tenants set slug = trim(both '-' from slug);
alter table tenants alter column slug set not null;
create unique index if not exists ux_tenants_slug on tenants(slug);
alter table tenants add column if not exists plan varchar(40) not null default 'Starter';
alter table tenants add column if not exists logo_key varchar(255);
alter table tenants add column if not exists accent_color varchar(9) not null default '#2563EB';

create table if not exists tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role varchar(40) not null default 'STAFF',
  status varchar(20) not null default 'ACTIVE',
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index if not exists idx_memberships_user on tenant_memberships(user_id);

-- every existing user is an owner of their originating tenant
insert into tenant_memberships (tenant_id, user_id, role, status)
select u.tenant_id, u.id, 'OWNER', 'ACTIVE' from users u
on conflict do nothing;

create table if not exists tenant_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  introduction text,
  exclusions text,
  footer_text text,
  bank_details text,
  momo_details text,
  notification_prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists tax_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name varchar(80) not null,
  rate numeric(9,4) not null,
  applies_to varchar(160),
  effective_from date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists document_numbering (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  document_type varchar(40) not null,
  pattern varchar(80) not null,
  next_sequence integer not null default 1,
  unique (tenant_id, document_type)
);

-- ---------------------------------------------------------------- sales
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  reference varchar(40) not null,
  name varchar(180) not null,
  contact_name varchar(160),
  phone varchar(40),
  email varchar(160),
  stage varchar(40) not null default 'NEW',
  estimated_value numeric(19,4) not null default 0,
  source varchar(80),
  owner_name varchar(160),
  region varchar(80),
  city varchar(80),
  next_action varchar(200),
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, reference)
);
create index if not exists idx_leads_tenant_stage on leads(tenant_id, stage);

-- ---------------------------------------------------------------- delivery
alter table projects add column if not exists manager_name varchar(160);
alter table projects add column if not exists completion_percent integer not null default 0;
alter table projects add column if not exists health varchar(20) not null default 'ON_TRACK';
alter table projects add column if not exists risk_note varchar(200);
alter table projects add column if not exists contract_value numeric(19,4) not null default 0;

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  quotation_id uuid references quotations(id),
  contract_number varchar(40) not null,
  original_amount numeric(19,4) not null default 0,
  variation_amount numeric(19,4) not null default 0,
  retention_percent numeric(9,4) not null default 5,
  start_date date,
  end_date date,
  status varchar(30) not null default 'ACTIVE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, contract_number)
);

create table if not exists contract_milestones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  name varchar(120) not null,
  percent numeric(9,4) not null,
  amount numeric(19,4) not null default 0,
  status varchar(20) not null default 'PENDING',
  sort_order integer not null default 0
);

create table if not exists variations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  contract_id uuid references contracts(id),
  variation_number varchar(40) not null,
  title varchar(200) not null,
  detail text,
  amount numeric(19,4) not null default 0,
  status varchar(20) not null default 'DRAFT',
  requested_by varchar(160),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, variation_number)
);

-- ---------------------------------------------------------------- cash
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  contract_id uuid references contracts(id),
  milestone_id uuid references contract_milestones(id),
  invoice_number varchar(40) not null,
  invoice_type varchar(30) not null default 'PROGRESS',
  issue_date date not null default current_date,
  due_date date not null default current_date,
  subtotal numeric(19,4) not null default 0,
  tax_amount numeric(19,4) not null default 0,
  discount_amount numeric(19,4) not null default 0,
  total_amount numeric(19,4) not null default 0,
  paid_amount numeric(19,4) not null default 0,
  status varchar(30) not null default 'DRAFT',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, invoice_number)
);
create index if not exists idx_invoices_tenant_status_due on invoices(tenant_id, status, due_date);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(19,4) not null default 1,
  unit varchar(40),
  unit_price numeric(19,4) not null default 0,
  amount numeric(19,4) not null default 0,
  sort_order integer not null default 0
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  reference varchar(60) not null,
  method varchar(30) not null default 'BANK_TRANSFER',
  amount numeric(19,4) not null,
  paid_on date not null default current_date,
  recorded_by varchar(160),
  notes text,
  attachment_key varchar(255),
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_tenant_date on payments(tenant_id, paid_on);

create table if not exists project_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  reference varchar(40) not null,
  category varchar(40) not null default 'MATERIALS',
  vendor varchar(160),
  amount numeric(19,4) not null default 0,
  spent_on date not null default current_date,
  has_receipt boolean not null default false,
  receipt_key varchar(255),
  recorded_by varchar(160),
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, reference)
);
create index if not exists idx_expenses_tenant_project on project_expenses(tenant_id, project_id);

-- ---------------------------------------------------------------- cost library
alter table labour_rates add column if not exists region varchar(80);
alter table labour_rates add column if not exists crew_size integer not null default 1;
alter table labour_rates add column if not exists updated_at timestamptz not null default now();

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  name varchar(180) not null,
  unit varchar(40) not null default 'day',
  hire_rate numeric(19,4) not null default 0,
  transport_cost numeric(19,4) not null default 0,
  operator_cost numeric(19,4) not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists assemblies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name varchar(180) not null,
  category varchar(120),
  unit varchar(40) not null default 'm2',
  unit_cost numeric(19,4) not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists assembly_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  assembly_id uuid not null references assemblies(id) on delete cascade,
  material_id uuid references materials(id),
  labour_rate_id uuid references labour_rates(id),
  description varchar(200) not null,
  quantity numeric(19,4) not null default 1,
  unit varchar(40) not null,
  rate numeric(19,4) not null default 0,
  sort_order integer not null default 0
);

create table if not exists supplier_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  material_id uuid references materials(id),
  description varchar(200) not null,
  unit varchar(40) not null,
  price numeric(19,4) not null default 0,
  delivered_price numeric(19,4),
  effective_date date not null default current_date
);

create table if not exists material_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  material_id uuid references materials(id) on delete cascade,
  country varchar(80) not null default 'Ghana',
  region varchar(80),
  city varchar(80),
  supplier_id uuid references suppliers(id),
  price numeric(19,4) not null,
  source varchar(30) not null default 'TENANT',
  effective_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_material_prices_lookup on material_prices(material_id, effective_date desc);

-- ---------------------------------------------------------------- templates & documents
create table if not exists estimate_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name varchar(180) not null,
  category varchar(120),
  typical_value numeric(19,4) not null default 0,
  use_count integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists estimate_template_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  template_id uuid not null references estimate_templates(id) on delete cascade,
  name varchar(160) not null,
  sort_order integer not null default 0
);

create table if not exists estimate_template_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  template_section_id uuid not null references estimate_template_sections(id) on delete cascade,
  description text not null,
  category varchar(120),
  cost_type varchar(30) not null default 'MATERIAL',
  quantity numeric(19,4) not null default 1,
  unit varchar(40) not null,
  sort_order integer not null default 0
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name varchar(255) not null,
  kind varchar(30) not null default 'PLAN',
  storage_key varchar(255) not null,
  content_type varchar(120),
  size_bytes bigint not null default 0,
  uploaded_by varchar(160),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- activity & notifications
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_name varchar(160) not null,
  channel varchar(20) not null default 'PROJECTS',
  message text not null,
  entity_type varchar(60),
  entity_id uuid,
  href varchar(255),
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_tenant_created on activities(tenant_id, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  type varchar(60) not null,
  tone varchar(20) not null default 'info',
  title varchar(180) not null,
  body text,
  href varchar(255),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_tenant_read on notifications(tenant_id, read_at);

-- ---------------------------------------------------------------- quotation lifecycle
alter table quotations add column if not exists project_id uuid references projects(id);
alter table quotations add column if not exists client_id uuid references clients(id);
alter table quotations add column if not exists public_token varchar(64);
alter table quotations add column if not exists sent_at timestamptz;
alter table quotations add column if not exists viewed_at timestamptz;
alter table quotations add column if not exists view_count integer not null default 0;
alter table quotations add column if not exists owner_name varchar(160);
alter table quotations add column if not exists cost_total numeric(19,4) not null default 0;
alter table quotations add column if not exists updated_at timestamptz not null default now();
create unique index if not exists ux_quotations_token on quotations(public_token) where public_token is not null;

create table if not exists quotation_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  quotation_id uuid not null references quotations(id) on delete cascade,
  decision varchar(20) not null,
  comment text,
  ip_address varchar(80),
  user_agent varchar(255),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- ai
alter table ai_requests add column if not exists response jsonb;
alter table ai_requests add column if not exists provider varchar(40);
alter table ai_requests add column if not exists latency_ms integer;

create table if not exists ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  request_id uuid references ai_requests(id) on delete cascade,
  target_type varchar(40) not null,
  target_id uuid,
  payload jsonb not null,
  status varchar(20) not null default 'PENDING',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- estimate item cost typing
alter table estimate_items add column if not exists cost_type varchar(30) not null default 'MATERIAL';
alter table estimate_items add column if not exists material_id uuid references materials(id);
alter table estimates add column if not exists client_id uuid references clients(id);
alter table estimates add column if not exists estimator_name varchar(160);
