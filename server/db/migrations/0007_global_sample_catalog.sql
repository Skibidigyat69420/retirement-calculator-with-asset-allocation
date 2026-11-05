-- Samples are application-owned templates, not tenant-owned client drafts.
-- Keep one catalog row per sample and give each practice a private client
-- workspace when it opens a sample. This preserves tenant isolation for plans,
-- reports and dossiers while preventing duplicate sample rows.

create table if not exists sample_draft_catalog (
  id uuid primary key default gen_random_uuid(),
  sample_key text not null unique,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  status stw_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sample_client_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sample_draft_id uuid not null references sample_draft_catalog(id) on delete cascade,
  client_id uuid not null unique references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sample_draft_id)
);

insert into sample_draft_catalog (sample_key, name, data)
values
  ('shah', 'Rhea and Karan Shah', '{"tier":"HNI","stage":"IPS Draft","tags":["Tech Founder","Retirement 2035"],"financialSummary":{"netWorth":48500000,"investableAssets":38200000,"totalAssets":52000000,"totalLiabilities":3500000,"assetCount":8}}'::jsonb),
  ('malhotra', 'Vikram & Ananya Malhotra', '{"tier":"Ultra HNI","stage":"Discovery","tags":["Estate Succession","NRI Compliance"],"financialSummary":{"netWorth":124000000,"investableAssets":95000000,"totalAssets":130000000,"totalLiabilities":6000000,"assetCount":14}}'::jsonb),
  ('sharma', 'Sharma Family', '{"tier":"HNI","stage":"Active Mandate","tags":["Multi-Gen","Higher Education"],"financialSummary":{"netWorth":24700000,"investableAssets":18200000,"totalAssets":34400000,"totalLiabilities":9700000,"assetCount":6}}'::jsonb),
  ('mehta', 'Aarav Mehta', '{"tier":"Affluent","stage":"Risk Profiling","tags":["FIRE 45","Aggressive Growth"],"financialSummary":{"netWorth":8200000,"investableAssets":7800000,"totalAssets":8200000,"totalLiabilities":0,"assetCount":4}}'::jsonb)
on conflict (sample_key) do update
set name = excluded.name, data = excluded.data, status = 'active', updated_at = now();

-- Preserve existing linked test clients before removing the old per-tenant
-- sample copies. For duplicate legacy rows, retain the earliest linked client.
insert into sample_client_workspaces (organization_id, sample_draft_id, client_id)
select distinct on (legacy.organization_id, catalog.id)
  legacy.organization_id, catalog.id, legacy.client_id
from client_drafts legacy
join sample_draft_catalog catalog on catalog.sample_key = legacy.sample_key
where legacy.is_sample = true and legacy.client_id is not null
order by legacy.organization_id, catalog.id, legacy.created_at asc
on conflict (organization_id, sample_draft_id) do nothing;

-- Legacy sample rows are no longer the source of truth. Non-sample drafts are
-- intentionally untouched.
delete from client_drafts where is_sample = true;

-- Make migrated workspaces fully usable even when migration 0006 was not run.
insert into financial_resources (organization_id, client_id, resource_type, data)
select w.organization_id, w.client_id, 'assets', jsonb_build_object(
  'name', 'Sample opening portfolio', 'category', 'equity', 'assetCategory', 'equity', 'currency', 'INR',
  'currentValue', coalesce((d.data #>> '{financialSummary,investableAssets}')::numeric, 1000000), 'expectedReturn', 10
)
from sample_client_workspaces w join sample_draft_catalog d on d.id = w.sample_draft_id
where not exists (select 1 from financial_resources r where r.client_id = w.client_id and r.resource_type = 'assets' and r.status = 'active');

insert into financial_resources (organization_id, client_id, resource_type, data)
select w.organization_id, w.client_id, 'cashflows', jsonb_build_object(
  'type', 'income', 'annualAmount', greatest(1200000, coalesce((d.data #>> '{financialSummary,investableAssets}')::numeric, 1200000) * 0.08)
)
from sample_client_workspaces w join sample_draft_catalog d on d.id = w.sample_draft_id
where not exists (select 1 from financial_resources r where r.client_id = w.client_id and r.resource_type = 'cashflows' and r.data->>'type' = 'income' and r.status = 'active');

insert into financial_resources (organization_id, client_id, resource_type, data)
select w.organization_id, w.client_id, 'goals', jsonb_build_object(
  'name', 'Sample retirement objective', 'targetAmount', greatest(5000000, coalesce((d.data #>> '{financialSummary,netWorth}')::numeric, 5000000) * 1.5), 'yearsToGoal', 15, 'priority', 'essential'
)
from sample_client_workspaces w join sample_draft_catalog d on d.id = w.sample_draft_id
where not exists (select 1 from financial_resources r where r.client_id = w.client_id and r.resource_type = 'goals' and r.status = 'active');

alter table sample_draft_catalog enable row level security;
alter table sample_client_workspaces enable row level security;

drop policy if exists sample_draft_catalog_read on sample_draft_catalog;
create policy sample_draft_catalog_read on sample_draft_catalog
  for select using (true);

drop policy if exists sample_workspaces_org_access on sample_client_workspaces;
create policy sample_workspaces_org_access on sample_client_workspaces
  for all using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));
