-- Refresh token rotation, password reset and email verification.

create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  family_id uuid not null,
  token_hash varchar(128) not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid,
  user_agent varchar(255),
  ip_address varchar(80)
);
create index if not exists idx_refresh_user on refresh_tokens(user_id, revoked_at);
create index if not exists idx_refresh_family on refresh_tokens(family_id);

create table if not exists auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose varchar(30) not null,
  token_hash varchar(128) not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_auth_tokens_user on auth_tokens(user_id, purpose);

create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  email varchar(160) not null,
  ip_address varchar(80),
  successful boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_email on login_attempts(email, attempted_at desc);
create index if not exists idx_login_attempts_ip on login_attempts(ip_address, attempted_at desc);

alter table users add column if not exists last_login_at timestamptz;
alter table users add column if not exists password_changed_at timestamptz;
