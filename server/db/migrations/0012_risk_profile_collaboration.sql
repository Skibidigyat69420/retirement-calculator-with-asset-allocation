-- Collaboration metadata is separate from the numerical score so adviser and
-- client progress remains visible without treating an unfinished client form
-- as an approved planning input.
alter table risk_assessments
  drop constraint if exists risk_assessments_status_check;
alter table risk_assessments
  add constraint risk_assessments_status_check check (status in ('invited', 'completed', 'revoked'));
alter table risk_assessments
  add column if not exists answer_details jsonb not null default '{}'::jsonb,
  add column if not exists sent_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists revoked_at timestamptz;

alter table client_risk_profiles
  add column if not exists answer_details jsonb not null default '{}'::jsonb,
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_user_id uuid references users(id) on delete set null,
  add column if not exists applied_at timestamptz,
  add column if not exists client_confirmed_at timestamptz,
  add column if not exists version integer not null default 1;
alter table client_risk_profiles
  drop constraint if exists client_risk_profiles_workflow_status_check;
alter table client_risk_profiles
  add constraint client_risk_profiles_workflow_status_check
  check (workflow_status in ('draft', 'sent', 'client_in_progress', 'submitted', 'reviewed', 'applied'));

create table if not exists client_risk_profile_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  profile_id uuid not null references client_risk_profiles(id) on delete cascade,
  version integer not null,
  status text not null,
  source text not null,
  workflow_status text not null,
  answers jsonb not null,
  answer_details jsonb not null default '{}'::jsonb,
  risk_score integer,
  risk_verdict text,
  completed_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references users(id) on delete set null,
  applied_at timestamptz,
  client_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, version)
);
create index if not exists client_risk_profile_versions_client_created_idx
  on client_risk_profile_versions (organization_id, client_id, created_at desc);
alter table client_risk_profile_versions enable row level security;
drop policy if exists client_risk_profile_versions_org_access on client_risk_profile_versions;
create policy client_risk_profile_versions_org_access on client_risk_profile_versions
  for all using (stw_is_current_org(organization_id)) with check (stw_is_current_org(organization_id));
