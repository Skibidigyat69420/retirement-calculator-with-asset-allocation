create table if not exists calculation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references plans(id) on delete cascade,
  plan_version_id uuid not null references plan_versions(id) on delete restrict,
  engine_version text not null,
  seed text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists calculation_runs_plan_created_idx
  on calculation_runs (organization_id, plan_id, created_at desc);

alter table calculation_runs enable row level security;

drop policy if exists calculation_runs_org_access on calculation_runs;
create policy calculation_runs_org_access on calculation_runs
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));
