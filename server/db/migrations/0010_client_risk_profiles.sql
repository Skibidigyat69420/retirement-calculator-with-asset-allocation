-- One current profile per household is the shared bridge between the adviser
-- workspace and the public Risk Profiler. Linked assessments remain history.
create table if not exists client_risk_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null unique references clients(id) on delete cascade,
  status text not null check (status in ('in_progress', 'completed')),
  source text not null check (source in ('advisor', 'client')),
  answers jsonb not null default '{}'::jsonb,
  risk_score integer check (risk_score between 0 and 100),
  risk_verdict text check (risk_verdict in ('Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_risk_profiles_org_updated_idx
  on client_risk_profiles (organization_id, updated_at desc);

alter table client_risk_profiles enable row level security;

drop policy if exists client_risk_profiles_org_access on client_risk_profiles;
create policy client_risk_profiles_org_access on client_risk_profiles
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));
