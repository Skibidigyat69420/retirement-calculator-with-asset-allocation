create table if not exists client_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  status stw_status not null default 'active',
  is_sample boolean not null default false,
  sample_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table client_drafts add column if not exists sample_key text;

create index if not exists client_drafts_org_status_idx on client_drafts (organization_id, status, created_at desc);
create unique index if not exists client_drafts_org_sample_key_idx
  on client_drafts (organization_id, sample_key) where sample_key is not null;

alter table client_drafts enable row level security;
drop policy if exists client_drafts_org_access on client_drafts;
create policy client_drafts_org_access on client_drafts
  for all using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));
