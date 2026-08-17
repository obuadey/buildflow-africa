-- The shared reference price library, and the record of where each figure came from.
--
-- platform_prices already existed but nothing read or wrote it. These columns are what turn it
-- from a table into a usable library: a trade to group by, and an import trail so any rate can be
-- traced back to the document it was loaded from.

alter table platform_prices add column if not exists category varchar(120);
alter table platform_prices add column if not exists import_id uuid;
create index if not exists idx_platform_prices_name on platform_prices(lower(material_name));
create index if not exists idx_platform_prices_category on platform_prices(category);

-- A company opts in before anything rewrites its rates. Off by default: a contractor's price book
-- is their own commercial position, and it is not changed behind their back.
alter table tenants add column if not exists auto_update_rates boolean not null default false;
alter table tenants add column if not exists rates_updated_at timestamptz;

create table if not exists reference_price_imports (
  id uuid primary key default gen_random_uuid(),
  source varchar(160) not null,
  file_name varchar(255),
  country varchar(80) not null default 'Ghana',
  region varchar(80),
  effective_date date not null default current_date,
  rows_imported integer not null default 0,
  rows_rejected integer not null default 0,
  imported_by varchar(160),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_reference_imports_created on reference_price_imports(created_at desc);

-- material_prices is the history behind a rate. Every change writes a row here, so the figure an
-- estimate was priced at six months ago is still recoverable.
alter table material_prices add column if not exists changed_by varchar(160);
alter table material_prices add column if not exists note varchar(255);
