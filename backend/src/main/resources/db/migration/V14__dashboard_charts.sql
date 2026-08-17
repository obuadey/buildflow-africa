create table if not exists dashboard_charts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  scope varchar(40) not null default 'finance',
  title varchar(160) not null,
  chart_type varchar(20) not null default 'bar',
  dataset varchar(40) not null,
  measure varchar(40) not null,
  group_by varchar(40) not null,
  aggregation varchar(20) not null default 'sum',
  date_field varchar(40),
  status_filter varchar(80),
  project_filter varchar(80),
  limit_count integer not null default 8,
  sort_dir varchar(8) not null default 'desc',
  stacked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_dashboard_charts_tenant_scope
  on dashboard_charts(tenant_id, scope, created_at);

insert into dashboard_charts (
  tenant_id, scope, title, chart_type, dataset, measure, group_by, aggregation,
  date_field, limit_count, sort_dir
)
select id, 'finance', 'Amount by client', 'bar', 'invoices', 'total', 'client', 'sum',
  'issueDate', 8, 'desc'
from tenants
where not exists (
  select 1 from dashboard_charts c
  where c.tenant_id = tenants.id and c.scope = 'finance'
);

insert into dashboard_charts (
  tenant_id, scope, title, chart_type, dataset, measure, group_by, aggregation,
  date_field, limit_count, sort_dir
)
select id, 'finance', 'Invoices by status', 'donut', 'invoices', 'count', 'status', 'count',
  'issueDate', 8, 'desc'
from tenants
where (
  select count(*) from dashboard_charts c
  where c.tenant_id = tenants.id and c.scope = 'finance'
) = 1;
