-- Session invalidation and per-user dashboard preferences.
alter table users add column if not exists token_version integer not null default 0;

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  scope varchar(40) not null default 'dashboard',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (tenant_id, user_id, scope)
);

create table if not exists integration_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider varchar(60) not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);
