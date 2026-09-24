create extension if not exists pgcrypto;

do $$ begin
  create type stw_role as enum ('practice_owner', 'practice_admin', 'wealth_practitioner', 'associate', 'read_only');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type stw_status as enum ('active', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type stw_plan_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type stw_invitation_status as enum ('pending', 'accepted', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text not null unique,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role stw_role not null,
  status stw_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists practice_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  token_hash text not null unique,
  email text not null,
  role stw_role not null check (role <> 'practice_owner'),
  status stw_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  household_id uuid not null default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  preferred_name text,
  email text,
  phone text,
  date_of_birth text,
  marital_status text,
  notes text,
  status stw_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  assignment_role text not null default 'lead',
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create table if not exists financial_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  resource_type text not null check (resource_type in ('assets', 'liabilities', 'cashflows', 'goals')),
  data jsonb not null default '{}'::jsonb,
  status stw_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  status stw_plan_status not null default 'draft',
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  version_number integer not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  assumptions_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (plan_id, version_number)
);

alter table plans
  drop constraint if exists plans_current_version_id_fkey,
  add constraint plans_current_version_id_fkey foreign key (current_version_id) references plan_versions(id);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  event_type text not null,
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on organization_memberships(user_id, status);
create index if not exists clients_org_status_idx on clients(organization_id, status);
create index if not exists financial_resources_client_type_idx on financial_resources(client_id, resource_type, status);
create index if not exists plans_client_status_idx on plans(client_id, status);
create index if not exists invitations_token_hash_idx on practice_invitations(token_hash);
