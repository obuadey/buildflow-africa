alter table tenant_settings add column if not exists mfa_required boolean not null default true;
alter table tenant_settings add column if not exists ip_restriction_enabled boolean not null default false;
alter table tenant_settings add column if not exists allowed_ip_ranges text;

alter table document_numbering add column if not exists created_at timestamptz not null default now();
alter table document_numbering add column if not exists updated_at timestamptz;
