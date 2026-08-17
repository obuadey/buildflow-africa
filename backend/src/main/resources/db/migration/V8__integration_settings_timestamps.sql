-- integration_settings was created without the created_at column every tenant-owned entity carries,
-- which failed Hibernate schema validation and stopped the API from starting.
alter table integration_settings add column if not exists created_at timestamptz not null default now();
