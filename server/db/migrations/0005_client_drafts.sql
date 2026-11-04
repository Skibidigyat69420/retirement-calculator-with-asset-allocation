create table if not exists client_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  status stw_status not null default 'active',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_drafts_org_status_idx on client_drafts (organization_id, status, created_at desc);

alter table client_drafts enable row level security;
drop policy if exists client_drafts_org_access on client_drafts;
create policy client_drafts_org_access on client_drafts
  for all using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));
