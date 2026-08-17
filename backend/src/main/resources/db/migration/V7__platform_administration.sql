-- Platform administration: the operator's view across every company.

-- A platform role is separate from tenant roles. Null means an ordinary customer account.
alter table users add column if not exists platform_role varchar(30);
create index if not exists idx_users_platform_role on users(platform_role) where platform_role is not null;

-- Company lifecycle, so an operator can suspend without deleting.
alter table tenants add column if not exists status varchar(20) not null default 'ACTIVE';
alter table tenants add column if not exists suspended_reason varchar(255);
alter table tenants add column if not exists suspended_at timestamptz;
alter table tenants add column if not exists trial_ends_on date;
alter table tenants add column if not exists created_at_index timestamptz;

-- Audit: tenant_id is nullable so platform actions are recorded in the same ledger.
alter table audit_logs add column if not exists actor_email varchar(160);
alter table audit_logs add column if not exists scope varchar(20) not null default 'TENANT';
alter table audit_logs add column if not exists user_agent varchar(255);
create index if not exists idx_audit_tenant_created on audit_logs(tenant_id, created_at desc);
create index if not exists idx_audit_scope_created on audit_logs(scope, created_at desc);
create index if not exists idx_audit_entity on audit_logs(entity_type, entity_id);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null,
  description varchar(255),
  enabled_globally boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (code)
);

create table if not exists tenant_feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  flag_code varchar(80) not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (tenant_id, flag_code)
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title varchar(180) not null,
  body text not null,
  severity varchar(20) not null default 'INFO',
  audience varchar(20) not null default 'ALL',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  published boolean not null default false,
  created_by varchar(160),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references users(id),
  tenant_id uuid not null references tenants(id) on delete cascade,
  reason varchar(255) not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ip_address varchar(80)
);
create index if not exists idx_impersonation_admin on impersonation_sessions(admin_user_id, started_at desc);

-- Platform price library: the national and regional reference prices tenants fall back to.
create table if not exists platform_prices (
  id uuid primary key default gen_random_uuid(),
  country varchar(80) not null default 'Ghana',
  region varchar(80),
  city varchar(80),
  material_name varchar(180) not null,
  brand varchar(120),
  unit varchar(40) not null,
  price numeric(19,4) not null,
  source varchar(120),
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_platform_prices_lookup
  on platform_prices(country, region, material_name, effective_date desc);

insert into feature_flags (code, description, enabled_globally) values
  ('ai_scope_generation', 'Draft estimate scope from a written description', true),
  ('ai_estimate_review', 'Review an estimate for omissions and thin margin', true),
  ('boq_import', 'Import a bill of quantities from CSV or Excel', false),
  ('supplier_comparison', 'Compare delivered supplier prices for a quantity', false),
  ('whatsapp_delivery', 'Send quotations over WhatsApp', false),
  ('drawing_takeoff', 'Measure quantities from uploaded drawings', false)
on conflict (code) do nothing;
