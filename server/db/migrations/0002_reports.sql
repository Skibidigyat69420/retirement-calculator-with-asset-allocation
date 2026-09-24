do $$ begin
  create type stw_report_kind as enum ('plan-report', 'dossier');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type stw_report_status as enum ('draft', 'review', 'approved', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  kind stw_report_kind not null,
  name text not null,
  version integer not null,
  status stw_report_status not null default 'review',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_org_client_idx on reports(organization_id, client_id, created_at desc);
