-- Site records: the daily diary, punch list and accommodation registers kept on a running job.
-- One table, because the three share a shape and the product filters them by module.
create table if not exists module_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  module varchar(40) not null,
  title varchar(200) not null,
  source varchar(20) not null default 'FIELD',
  type varchar(60),
  status varchar(30) not null default 'Open',
  priority varchar(20),
  owner_name varchar(160),
  due_date date,
  value numeric(19,4),
  quantity numeric(19,4),
  unit varchar(40),
  linked_record varchar(200),
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_module_records_tenant_module
  on module_records(tenant_id, module, created_at desc);
create index if not exists idx_module_records_project on module_records(tenant_id, project_id);
